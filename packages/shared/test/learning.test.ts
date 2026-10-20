import { describe, expect, it } from "vitest";
import {
  adaptiveBand,
  createInitialState,
  learningSummary,
  masteryMap,
  planEvidence,
  supportFor,
  vocabularyMastery,
  DEFAULT_LEARNING_SETTINGS,
} from "@mir/shared";
import type { LearningEvidence, GameState } from "@mir/shared";

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;

function evidence(partial: Partial<LearningEvidence> & { vocab: string }): LearningEvidence {
  return {
    id: Math.random().toString(36).slice(2),
    vocab: partial.vocab,
    skill: partial.skill ?? "recognition",
    outcome: partial.outcome ?? 1,
    at: partial.at ?? NOW,
    source: partial.source ?? "test",
    support: partial.support ?? { translation: false, hint: false, audio: false, typed: false },
  };
}

function withEvidence(items: LearningEvidence[]): GameState {
  const state = createInitialState(NOW, "Тест");
  state.started = true;
  state.language.evidence = items;
  return state;
}

describe("evidence-based mastery", () => {
  it("weighs unaided answers above translated answers", () => {
    const independent = vocabularyMastery(
      [evidence({ vocab: "hleb" }), evidence({ vocab: "hleb", at: NOW - DAY })],
      "hleb",
      undefined,
      NOW,
    );
    const assisted = vocabularyMastery(
      [
        evidence({
          vocab: "hleb",
          support: { translation: true, hint: false, audio: false, typed: false },
        }),
        evidence({
          vocab: "hleb",
          at: NOW - DAY,
          support: { translation: true, hint: false, audio: false, typed: false },
        }),
      ],
      "hleb",
      undefined,
      NOW,
    );
    expect(independent.overall).toBeGreaterThan(assisted.overall);
  });

  it("schedules later reviews from strong evidence", () => {
    const one = vocabularyMastery([evidence({ vocab: "metro" })], "metro", undefined, NOW);
    const three = vocabularyMastery(
      [
        evidence({ vocab: "metro" }),
        evidence({ vocab: "metro", at: NOW - DAY }),
        evidence({ vocab: "metro", at: NOW - 2 * DAY }),
      ],
      "metro",
      undefined,
      NOW,
    );
    expect(three.dueAt).toBeGreaterThan(one.dueAt);
  });

  it("counts all six abilities only when they were really practised", () => {
    const plan = planEvidence({
      vocab: ["myach"],
      mode: "typed",
      correct: true,
      support: { translation: false, hint: false, audio: true, typed: true },
    });
    expect(plan.skills).toEqual(
      expect.arrayContaining(["recognition", "production", "recall", "reading", "listening"]),
    );
    const assisted = planEvidence({
      vocab: ["myach"],
      mode: "typed",
      correct: true,
      support: { translation: true, hint: true, audio: false, typed: true },
    });
    expect(assisted.skills).not.toContain("reading");
    expect(assisted.skills).not.toContain("listening");
  });

  it("reports honest totals, no invented percentages", () => {
    const state = withEvidence([
      evidence({ vocab: "hleb", skill: "recognition" }),
      evidence({ vocab: "hleb", skill: "reading" }),
      evidence({ vocab: "moloko", skill: "production", outcome: 0.15 }),
    ]);
    const summary = learningSummary(state, NOW);
    expect(summary.evidenceCount).toBe(3);
    expect(summary.wordsPracticed).toBe(2);
    expect(summary.skills.production.count).toBe(1);
    expect(summary.knownWords).toBe(1);
  });
});

describe("adaptive support", () => {
  it("starts in companion mode and earns immersion only with evidence", () => {
    const fresh = createInitialState(NOW, "Тест");
    expect(adaptiveBand(fresh, NOW)).toBe("companion");
    const evidenceList: LearningEvidence[] = [];
    for (let i = 0; i < 50; i++) {
      evidenceList.push(evidence({ vocab: `word${i % 20}`, skill: "reading" }));
    }
    const advanced = withEvidence(evidenceList);
    expect(adaptiveBand(advanced, NOW)).toBe("immersion");
    expect(adaptiveBand(withEvidence(evidenceList.slice(0, 20)), NOW)).toBe("guided");
  });

  it("shows translations by default only while knowledge is thin", () => {
    const state = createInitialState(NOW, "Тест");
    const decision = supportFor(state, DEFAULT_LEARNING_SETTINGS, NOW);
    expect(decision.showTranslation).toBe(true);
    const evidenceList: LearningEvidence[] = [];
    for (let i = 0; i < 40; i++) {
      evidenceList.push(evidence({ vocab: `word${i}`, skill: "reading" }));
    }
    const advanced = supportFor(withEvidence(evidenceList), DEFAULT_LEARNING_SETTINGS, NOW);
    expect(advanced.showTranslation).toBe(false);
  });

  it("does not claim mastery of unstudied words", () => {
    const state = withEvidence([evidence({ vocab: "hleb" })]);
    const map = masteryMap(state, NOW);
    expect(map.moloko).toBeUndefined();
  });
});
