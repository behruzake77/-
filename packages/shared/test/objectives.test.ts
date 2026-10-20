import { describe, expect, it } from "vitest";
import { activeObjectiveMarkers, applyAction, createInitialState, QUESTS_BY_ID } from "@mir/shared";
import type { GameAction, GameState } from "@mir/shared";

let clock = 1_700_000_000_000;
const run = (state: GameState, action: GameAction) => {
  clock += 1000;
  return applyAction(state, action, clock);
};

function started(): GameState {
  const initial = createInitialState(clock, "Алекс");
  return run(initial, { type: "BEGIN" }).state;
}

describe("objective markers", () => {
  it("points at the note inside the flat", () => {
    let state = started();
    state = run(state, { type: "ENTER_ZONE", zone: "apartment", via: "from_courtyard" }).state;
    expect(activeObjectiveMarkers(state)).toContain("apartment.note");
  });

  it("points at Lidia once the note is read", () => {
    let state = started();
    state = run(state, { type: "ENTER_ZONE", zone: "apartment", via: "from_courtyard" }).state;
    state = run(state, { type: "INTERACT", targetId: "apartment.note" }).state;
    state = run(state, { type: "ENTER_ZONE", zone: "courtyard", via: "from_apartment" }).state;
    expect(activeObjectiveMarkers(state)).toContain("npc:lidia");
  });

  it("only returns authored markers, never invented ones", () => {
    const state = started();
    const authored = new Set(
      Object.values(QUESTS_BY_ID).flatMap((quest) =>
        quest.steps
          .map((step) => step.marker)
          .filter((marker): marker is string => Boolean(marker)),
      ),
    );
    for (const marker of activeObjectiveMarkers(state)) {
      expect(authored.has(marker)).toBe(true);
    }
  });

  it("drops markers when nothing is active", () => {
    const fresh = createInitialState(clock, "");
    expect(activeObjectiveMarkers(fresh)).toEqual([]);
  });
});
