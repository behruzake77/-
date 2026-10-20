import { describe, expect, it } from "vitest";
import { DIALOGUES, NPCS, QUESTS, VOCAB_BY_ID, ZONE_LIST, validateContent } from "@mir/shared";

describe("content integrity", () => {
  it("has no broken references", () => {
    expect(validateContent()).toEqual([]);
  });

  it("ships a small, complete neighbourhood", () => {
    expect(ZONE_LIST.length).toBeGreaterThanOrEqual(7);
    const ids = ZONE_LIST.map((zone) => zone.id);
    for (const required of ["apartment", "courtyard", "street", "shop", "metro", "cafe"]) {
      expect(ids).toContain(required);
    }
  });

  it("ships at least five distinct NPCs and the three core missions", () => {
    expect(NPCS.length).toBeGreaterThanOrEqual(5);
    const questIds = QUESTS.map((quest) => quest.id);
    expect(questIds).toEqual(expect.arrayContaining(["q_arrival", "q_metro", "q_shop"]));
  });

  it("introduces vocabulary in real interactions", () => {
    const used = new Set<string>();
    for (const dialogue of DIALOGUES) {
      for (const node of Object.values(dialogue.nodes)) {
        for (const vocab of node.vocab ?? []) used.add(vocab);
        for (const option of node.options ?? []) {
          for (const vocab of option.vocab ?? []) used.add(vocab);
        }
      }
    }
    expect(used.size).toBeGreaterThan(40);
    for (const id of used) expect(VOCAB_BY_ID[id], `vocabulary ${id}`).toBeDefined();
  });

  it("gives every spoken line a translation for optional support", () => {
    const missing: string[] = [];
    for (const dialogue of DIALOGUES) {
      for (const node of Object.values(dialogue.nodes)) {
        if (!node.en) missing.push(`${dialogue.id}#${node.id}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
