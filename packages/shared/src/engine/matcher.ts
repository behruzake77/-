import type { LanguageNote } from "../types.js";
import {
  normalizeRussian,
  tokenizeRu,
  tokenSetScore,
  hasCyrillic,
  hasLatin,
  transliterateToCyrillic,
  tokenMatches,
} from "./russian.js";

export interface MatchResult {
  status: "accepted" | "close" | "unclear";
  option?: MatchableOption;
  score: number;
  corrections: LanguageNote[];
  normalized: string;
  interpreted: string;
  usedTransliteration: boolean;
}

export interface MatchableOption {
  id: string;
  ru: string;
  en?: string;
  intent?: string;
  must?: string[][];
  nice?: string[];
  canonical?: string[];
}

interface Scored {
  option: MatchableOption;
  score: number;
  groupsHit: number;
  groupsTotal: number;
  canonicalScore: number;
  niceHits: number;
}

/**
 * Deterministic interpretation of a learner's Russian.
 *
 * We score semantic anchor groups (any phrasing is welcome), fuzzy string
 * similarity against authored model answers, and extra polite/fluency words.
 * A reply is accepted whenever the intended meaning is recognisable — grammar
 * mistakes are reported as gentle notes, never as a rejection.
 */
export function matchAnswer(text: string, options: MatchableOption[]): MatchResult {
  const corrections: LanguageNote[] = [];
  const raw = text.trim();
  let working = raw;
  let usedTransliteration = false;

  if (!hasCyrillic(raw) && hasLatin(raw)) {
    working = transliterateToCyrillic(raw);
    usedTransliteration = true;
    corrections.push({
      ru: `Ты написал(а) латиницей. По-русски это: «${working}». Я понял(а) тебя.`,
      en: `You typed in Latin letters. In Russian that is: “${working}”. I understood you.`,
    });
  }

  const normalized = normalizeRussian(working);
  const tokens = tokenizeRu(working);

  if (!tokens.length) {
    return {
      status: "unclear",
      score: 0,
      corrections,
      normalized,
      interpreted: working,
      usedTransliteration,
    };
  }

  const scored: Scored[] = options.map((option) => {
    const groups = option.must ?? [];
    let groupsHit = 0;
    for (const group of groups) {
      if (group.some((keyword) => tokens.some((token) => tokenMatches(token, keyword)))) {
        groupsHit++;
      }
    }
    const canonicals = [option.ru, ...(option.canonical ?? [])].filter(Boolean);
    let canonicalScore = 0;
    for (const canonical of canonicals) {
      canonicalScore = Math.max(canonicalScore, tokenSetScore(tokens, tokenizeRu(canonical)));
    }
    const niceHits = (option.nice ?? []).filter((word) =>
      tokens.some((token) => tokenMatches(token, word)),
    ).length;

    let score: number;
    if (groups.length > 0) {
      const groupRatio = groupsHit / groups.length;
      score = groupRatio * 0.72 + canonicalScore * 0.28;
      if (groupsHit === groups.length)
        score = Math.max(score, 0.86) + Math.min(0.08, niceHits * 0.03);
      if (canonicalScore >= 0.85) score = Math.max(score, 0.9);
    } else {
      score = canonicalScore;
    }
    score = Math.min(1, score);
    return {
      option,
      score,
      groupsHit,
      groupsTotal: groups.length,
      canonicalScore,
      niceHits,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best) {
    return {
      status: "unclear",
      score: 0,
      corrections,
      normalized,
      interpreted: working,
      usedTransliteration,
    };
  }

  const allGroupsHit = best.groupsTotal > 0 && best.groupsHit === best.groupsTotal;
  const accepted = allGroupsHit || best.canonicalScore >= 0.8 || best.score >= 0.82;
  const close =
    !accepted &&
    (best.score >= 0.58 ||
      (best.groupsTotal > 0 &&
        best.groupsHit / best.groupsTotal >= 0.5 &&
        best.canonicalScore >= 0.35));

  // Conservative, clearly useful feedback for beginners.
  const lower = normalized;
  if (/\b(дай|дай мне|дайте мне)\b/.test(lower) && !/\bпожалуйста\b/.test(lower)) {
    corrections.push({
      ru: "С незнакомыми людьми мягче звучит «Дайте, пожалуйста…». Это не ошибка — просто вежливее.",
      en: "With strangers, “Дайте, пожалуйста…” sounds softer. Not a mistake — just more polite.",
    });
  }
  if (/\bты\b/.test(lower) && /\b(вы|вас|вам)\b/.test(lower)) {
    corrections.push({
      ru: "Ты смешал(а) «ты» и «вы». С незнакомыми лучше «вы».",
      en: "You mixed “ты” and “вы”. With strangers, “вы” is safer.",
    });
  }
  if (usedTransliteration) {
    corrections.push({
      ru: `Попробуй набрать кириллицей: «${working}».`,
      en: `Try typing it in Cyrillic: “${working}”.`,
    });
  }
  if (best.option && best.score > 0.8 && best.option.canonical?.[0] && !allGroupsHit) {
    const target = best.option.canonical[0];
    const targetTokens = tokenizeRu(target);
    const missing = targetTokens.filter((t) => !tokens.some((x) => tokenMatches(x, t)));
    if (missing.length > 0 && missing.length <= 2) {
      corrections.push({
        ru: `Можно ещё так: «${target}».`,
        en: `You could also say: “${target}”.`,
      });
    }
  }

  return {
    status: accepted ? "accepted" : close ? "close" : "unclear",
    option: best.option,
    score: Math.round(best.score * 100) / 100,
    corrections,
    normalized,
    interpreted: working,
    usedTransliteration,
  };
}

/**
 * How much help did the learner receive? Used to weight language evidence so
 * that looking at a translation doesn't count the same as unaided recall.
 */
export function supportWeight(support: {
  translation: boolean;
  hint: boolean;
  typed: boolean;
  aiAssist?: boolean;
}): number {
  let weight = 1;
  if (support.translation) weight *= 0.55;
  if (support.hint) weight *= 0.6;
  if (support.aiAssist) weight *= 0.7;
  if (!support.typed) weight *= 0.9;
  return Math.max(0.15, Math.round(weight * 100) / 100);
}
