import type {
  GameState,
  LearningEvidence,
  LearningSettings,
  Skill,
  Support,
  VocabMastery,
} from "../types.js";

const DAY = 24 * 60 * 60 * 1000;
const HALF_LIFE = 18 * DAY;

export const SKILLS: Skill[] = [
  "recognition",
  "listening",
  "reading",
  "recall",
  "production",
  "retention",
];

function evidenceWeight(e: LearningEvidence): number {
  let w = 1;
  if (e.support.translation) w *= 0.55;
  if (e.support.hint) w *= 0.6;
  if (e.support.aiAssist) w *= 0.7;
  if (!e.support.typed) w *= 0.9;
  if (e.skill === "listening" && !e.support.audio) w *= 0.5;
  return w;
}

export function decay(ageMs: number): number {
  return 0.5 ** (Math.max(0, ageMs) / HALF_LIFE);
}

export function vocabularyMastery(
  evidence: LearningEvidence[],
  vocab: string,
  skill?: Skill,
  now = Date.now(),
): VocabMastery {
  const relevant = evidence.filter((e) => e.vocab === vocab && (skill ? e.skill === skill : true));
  const skillSums: Partial<Record<Skill, { sum: number; decay: number }>> = {};
  let weighted = 0;
  let totalDecay = 0;
  let strongCount = 0;
  let lastAt = 0;

  for (const e of relevant) {
    const fresh = decay(now - e.at);
    const w = fresh * evidenceWeight(e);
    const bucket = skillSums[e.skill] ?? { sum: 0, decay: 0 };
    bucket.sum += e.outcome * w;
    bucket.decay += fresh;
    skillSums[e.skill] = bucket;
    weighted += e.outcome * w;
    totalDecay += fresh;
    if (e.outcome >= 0.75 && evidenceWeight(e) >= 0.5) strongCount++;
    lastAt = Math.max(lastAt, e.at);
  }

  const bySkill: Partial<Record<Skill, number>> = {};
  for (const [key, bucket] of Object.entries(skillSums) as [
    Skill,
    { sum: number; decay: number },
  ][]) {
    if (bucket.decay > 0) bySkill[key] = clamp01(bucket.sum / bucket.decay);
  }

  const overall = totalDecay > 0 ? clamp01(weighted / totalDecay) : 0;
  const intervals = [0.25, 1, 3, 8, 21, 45];
  const intervalDays = intervals[Math.min(intervals.length - 1, Math.max(0, strongCount - 1))];
  const dueAt = lastAt ? lastAt + intervalDays * DAY : 0;

  return {
    vocab,
    bySkill,
    overall,
    attempts: relevant.length,
    lastAt,
    dueAt,
    strength: relevant.reduce(
      (sum, e) => sum + decay(now - e.at) * e.outcome * evidenceWeight(e),
      0,
    ),
  };
}

export function masteryMap(state: GameState, now = Date.now()): Record<string, VocabMastery> {
  const vocab = new Set(state.language.evidence.map((e) => e.vocab));
  const out: Record<string, VocabMastery> = {};
  for (const id of vocab) out[id] = vocabularyMastery(state.language.evidence, id, undefined, now);
  return out;
}

export type MasteryBand = "unknown" | "new" | "familiar" | "solid" | "strong";

export function masteryBand(m: VocabMastery | undefined): MasteryBand {
  if (!m || m.attempts === 0) return "unknown";
  if (m.overall >= 0.82 && m.attempts >= 3) return "strong";
  if (m.overall >= 0.6) return "solid";
  if (m.overall >= 0.35) return "familiar";
  return "new";
}

export type AdaptiveBand = "companion" | "guided" | "immersion";

/** Difficulty derived only from real evidence, never from time played. */
export function adaptiveBand(state: GameState, now = Date.now()): AdaptiveBand {
  const evidence = state.language.evidence;
  if (evidence.length < 14) return "companion";
  const map = masteryMap(state, now);
  const values = Object.values(map);
  const mean = values.length ? values.reduce((sum, m) => sum + m.overall, 0) / values.length : 0;
  const independent = evidence.filter(
    (e) => e.outcome >= 0.75 && !e.support.translation && !e.support.hint,
  ).length;
  if (evidence.length >= 45 && mean >= 0.62 && independent >= 18) return "immersion";
  if (independent >= 6 && mean >= 0.42) return "guided";
  return "companion";
}

export interface SupportDecision {
  showTranslation: boolean;
  showTransliteration: boolean;
  allowIcons: boolean;
  allowChoices: boolean;
  reasonRu: string;
  reasonEn: string;
}

export function supportFor(
  state: GameState,
  settings: LearningSettings,
  now = Date.now(),
): SupportDecision {
  const band = adaptiveBand(state, now);
  if (settings.translations === "always") {
    return {
      showTranslation: true,
      showTransliteration: settings.showTransliteration,
      allowIcons: true,
      allowChoices: true,
      reasonRu: "Переводы включены в настройках.",
      reasonEn: "Translations are always on in settings.",
    };
  }
  if (settings.translations === "onDemand" || settings.translations === "off") {
    return {
      showTranslation: false,
      showTransliteration: settings.showTransliteration,
      allowIcons: band !== "immersion",
      allowChoices: true,
      reasonRu: "Перевод по кнопке.",
      reasonEn: "Translation on demand.",
    };
  }
  return {
    showTranslation: band === "companion",
    showTransliteration: settings.showTransliteration,
    allowIcons: band !== "immersion",
    allowChoices: true,
    reasonRu:
      band === "companion"
        ? "Сейчас переводы видны сразу. Позже они станут подсказкой."
        : "Новые переводы — по кнопке.",
    reasonEn:
      band === "companion"
        ? "Translations are shown for now. Later they become optional hints."
        : "Translations are optional hints now.",
  };
}

export interface SkillStat {
  count: number;
  mean: number;
}

export interface LearningSummary {
  evidenceCount: number;
  wordsPracticed: number;
  skills: Record<Skill, SkillStat>;
  band: AdaptiveBand;
  dueNow: string[];
  knownWords: number;
  reviewedWords: number;
}

/** Honest summary built exclusively from stored evidence. */
export function learningSummary(state: GameState, now = Date.now()): LearningSummary {
  const bySkill = Object.fromEntries(
    SKILLS.map((skill) => [skill, { count: 0, sum: 0 }]),
  ) as Record<Skill, { count: number; sum: number }>;
  const map: Record<string, VocabMastery> = {};

  for (const e of state.language.evidence) {
    const stat = bySkill[e.skill];
    if (stat) {
      stat.count++;
      stat.sum += e.outcome;
    }
    map[e.vocab] =
      map[e.vocab] ?? vocabularyMastery(state.language.evidence, e.vocab, undefined, now);
  }

  const values = Object.values(map);
  return {
    evidenceCount: state.language.evidence.length,
    wordsPracticed: values.length,
    skills: Object.fromEntries(
      SKILLS.map((skill) => [
        skill,
        {
          count: bySkill[skill].count,
          mean: bySkill[skill].count ? bySkill[skill].sum / bySkill[skill].count : 0,
        },
      ]),
    ) as Record<Skill, SkillStat>,
    band: adaptiveBand(state, now),
    dueNow: values
      .filter((m) => m.dueAt > 0 && m.dueAt <= now && m.overall < 0.85)
      .map((m) => m.vocab),
    knownWords: values.filter((m) => m.overall >= 0.6).length,
    reviewedWords: values.filter((m) => Object.keys(m.bySkill).length > 1).length,
  };
}

export interface SkillPlan {
  vocab: string[];
  skills: Skill[];
  outcome: number;
}

/**
 * Turn one answered interaction into real skill evidence.
 * Reading/listening are only claimed when the player actually had that modality
 * (audio played, translation hidden), so the journal never inflates progress.
 */
export function planEvidence(input: {
  vocab: string[];
  mode: "choice" | "typed";
  correct: boolean;
  support: Support;
  retention?: boolean;
  successScore?: number;
}): SkillPlan {
  const vocab = [...new Set(input.vocab)].filter(Boolean);
  const skills: Skill[] = [];
  if (input.correct) {
    skills.push("recognition");
    if (input.mode === "typed") skills.push("production");
    if (input.mode === "typed" && !input.support.translation) skills.push("recall");
    if (!input.support.translation) skills.push("reading");
    if (input.support.audio) skills.push("listening");
    if (input.retention) skills.push("retention");
  } else {
    skills.push("recognition");
  }
  return {
    vocab,
    skills,
    outcome: input.correct ? clamp01(input.successScore ?? 1) : 0.15,
  };
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000));
}

/** Highest-value words for a later review encounter. */
export function dueWords(state: GameState, now = Date.now(), limit = 6): string[] {
  const map = masteryMap(state, now);
  return Object.values(map)
    .filter((m) => m.dueAt > 0 && m.dueAt <= now)
    .sort((a, b) => a.overall - b.overall)
    .slice(0, limit)
    .map((m) => m.vocab);
}

export const MAX_EVIDENCE = 900;

export function trimEvidence(evidence: LearningEvidence[]): LearningEvidence[] {
  if (evidence.length <= MAX_EVIDENCE) return evidence;
  return evidence.slice(evidence.length - MAX_EVIDENCE);
}
