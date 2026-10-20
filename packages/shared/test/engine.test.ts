import { describe, expect, it } from "vitest";
import {
  DIALOGUES_BY_ID,
  applyAction,
  createInitialState,
  parseGameState,
  relationshipBand,
} from "@mir/shared";
import type { ActionResult, GameAction, GameState } from "@mir/shared";

let clock = 1_700_000_000_000;
function tick(): number {
  clock += 1000;
  return clock;
}

function run(state: GameState, action: GameAction): ActionResult {
  return applyAction(state, action, tick());
}

function beginGame(): { state: GameState; events: string[] } {
  const initial = createInitialState(tick(), "Алекс");
  const result = run(initial, { type: "BEGIN" });
  return { state: result.state, events: result.events.map((event) => event.kind) };
}

function reachApartment(state: GameState): GameState {
  return run(state, { type: "ENTER_ZONE", zone: "apartment", via: "from_courtyard" }).state;
}

function choose(
  state: GameState,
  dialogueId: string,
  nodeId: string,
  optionId: string,
  support?: { translation?: boolean; hint?: boolean; audio?: boolean },
): ActionResult {
  return run(state, {
    type: "CHOOSE",
    dialogueId,
    nodeId,
    optionId,
    support: { translation: false, hint: false, audio: false, typed: false, ...support },
  });
}

describe("opening and first mission", () => {
  it("starts in the courtyard with a quest and money", () => {
    const { state } = beginGame();
    expect(state.started).toBe(true);
    expect(state.player.zone).toBe("courtyard");
    expect(state.player.money).toBeGreaterThan(0);
    expect(state.quests.q_arrival.status).toBe("active");
    expect(state.inventory.key).toBe(1);
  });

  it("advances the arrival mission through authored world actions", () => {
    let { state } = beginGame();
    let result = run(state, { type: "ENTER_ZONE", zone: "apartment", via: "from_courtyard" });
    state = result.state;
    expect(state.quests.q_arrival.step).toBe(1);

    result = run(state, { type: "INTERACT", targetId: "apartment.note" });
    state = result.state;
    expect(state.flags["apt.note_read"]).toBe(true);
    expect(state.journal.map((entry) => entry.id)).toContain("note_anna");
    expect(state.quests.q_arrival.step).toBe(2);

    state = run(state, { type: "ENTER_ZONE", zone: "courtyard", via: "from_apartment" }).state;
    result = run(state, { type: "INTERACT", targetId: "npc:lidia" });
    state = result.state;
    expect(result.dialogue?.dialogueId).toBe("lidia_phone");

    result = choose(state, "lidia_phone", "help", "ask_phone");
    state = result.state;
    expect(state.flags["lidia.phone_asked"]).toBe(true);

    result = choose(state, "lidia_phone", "anna_where", "in_courtyard");
    state = result.state;

    result = choose(state, "lidia_phone", "anna_task", "agree_shopping");
    state = result.state;
    expect(state.flags["anna.called"]).toBe(true);
    expect(state.quests.q_arrival.status).toBe("completed");
    expect(state.quests.q_metro.status).toBe("active");
    expect(state.quests.q_shop.status).toBe("active");
    expect(result.events.map((event) => event.kind)).toContain("questCompleted");
  });

  it("records real language evidence from a correct choice", () => {
    let { state } = beginGame();
    const before = state.language.evidence.length;
    const result = choose(state, "lidia_phone", "help", "ask_phone");
    state = result.state;
    expect(state.language.evidence.length).toBeGreaterThan(before);
    const skills = new Set(state.language.evidence.map((item) => item.skill));
    expect(skills.has("recognition")).toBe(true);
    expect(skills.has("reading")).toBe(true);
    expect(state.language.evidence.every((item) => item.vocab !== "")).toBe(true);
  });

  it("marks a misunderstanding as low evidence without failing the mission", () => {
    let { state } = beginGame();
    const result = choose(state, "lidia_phone", "help", "ask_price");
    state = result.state;
    const evidence = state.language.evidence.filter((item) => item.outcome < 0.5);
    expect(evidence.length).toBeGreaterThan(0);
    expect(state.flags["lidia.phone_asked"]).toBeUndefined();
    // The conversation continues and can be retried.
    expect(result.feedback?.next).toBe("phone_confused");
  });

  it("accepts a typed answer in different words", () => {
    let { state } = beginGame();
    const result = run(state, {
      type: "TYPE",
      dialogueId: "lidia_phone",
      nodeId: "anna_slow",
      text: "я в дворе",
      support: { translation: false, hint: false, audio: false, typed: true },
    });
    state = result.state;
    expect(result.feedback?.accepted).toBe(true);
    expect(result.feedback?.optionId).toBe("typed_courtyard");
    expect(result.feedback?.next).toBe("anna_relief");
    const skills = new Set(state.language.evidence.map((item) => item.skill));
    expect(skills.has("production")).toBe(true);
    expect(skills.has("recall")).toBe(true);
  });

  it("gives gentle help when a typed answer is not understood", () => {
    let { state } = beginGame();
    const result = run(state, {
      type: "TYPE",
      dialogueId: "lidia_phone",
      nodeId: "anna_slow",
      text: "абракадабра",
      support: { translation: false, hint: false, audio: false, typed: true },
    });
    state = result.state;
    expect(result.feedback?.accepted).toBe(false);
    expect(result.feedback?.messageRu).toContain("Не понял");
    expect(state.language.evidence.length).toBe(0);
    expect(state.quests.q_arrival.step).toBe(0);
  });
});

describe("shopping and metro chain", () => {
  function throughArrival(): GameState {
    let { state } = beginGame();
    state = reachApartment(state);
    state = run(state, { type: "INTERACT", targetId: "apartment.note" }).state;
    state = run(state, { type: "ENTER_ZONE", zone: "courtyard", via: "from_apartment" }).state;
    state = run(state, { type: "INTERACT", targetId: "npc:lidia" }).state;
    state = choose(state, "lidia_phone", "help", "ask_phone").state;
    state = choose(state, "lidia_phone", "anna_where", "in_courtyard").state;
    state = choose(state, "lidia_phone", "anna_task", "agree_shopping").state;
    return state;
  }

  it("buys real items, spends real money and completes the shopping mission", () => {
    let state = throughArrival();
    state = run(state, { type: "ENTER_ZONE", zone: "shop", via: "from_street" }).state;
    expect(state.quests.q_shop.step).toBe(1);
    const beforeMoney = state.player.money;

    let result = run(state, { type: "INTERACT", targetId: "shop.bread" });
    state = result.state;
    state = run(state, { type: "INTERACT", targetId: "shop.milk" }).state;
    expect(state.inventory.bread).toBe(1);
    expect(state.inventory.milk).toBe(1);
    expect(state.player.money).toBe(beforeMoney - 134);
    expect(state.quests.q_shop.status).toBe("completed");
    expect(state.npcs.nina.relationship).toBeGreaterThan(0);

    result = run(state, { type: "INTERACT", targetId: "shop.bread" });
    expect(result.state.player.money).toBe(beforeMoney - 179);
    expect(result.state.inventory.bread).toBe(2);
  });

  it("refuses purchases without money", () => {
    let state = throughArrival();
    state = run(state, { type: "ENTER_ZONE", zone: "shop", via: "from_street" }).state;
    state.player.money = 0;
    const result = run(state, { type: "INTERACT", targetId: "shop.bread" });
    expect(result.state.inventory.bread).toBeUndefined();
    expect(result.events.some((event) => event.kind === "error")).toBe(true);
  });

  it("completes the metro mission only after understanding the route", () => {
    let state = throughArrival();
    state = run(state, { type: "ENTER_ZONE", zone: "metro", via: "from_street" }).state;
    expect(state.quests.q_metro.step).toBe(1);
    const opened = run(state, { type: "INTERACT", targetId: "npc:andrey" });
    state = opened.state;
    expect(opened.dialogue?.dialogueId).toBe("andrey_meet");
    state = choose(state, "andrey_meet", "check", "two_stops").state;
    expect(state.flags["andrey.route_known"]).toBe(true);
    expect(state.quests.q_metro.status).toBe("completed");

    // Anna only appears once both missions are complete.
    state = run(state, { type: "ENTER_ZONE", zone: "cafe", via: "from_street" }).state;
    expect(state.quests.q_cafe).toBeUndefined();
  });

  it("meets Anna only when the route and the shopping are done", () => {
    let state = throughArrival();
    state = run(state, { type: "ENTER_ZONE", zone: "shop", via: "from_street" }).state;
    state = run(state, { type: "INTERACT", targetId: "shop.bread" }).state;
    state = run(state, { type: "INTERACT", targetId: "shop.milk" }).state;
    state = run(state, { type: "ENTER_ZONE", zone: "metro", via: "from_street" }).state;
    state = run(state, { type: "INTERACT", targetId: "npc:andrey" }).state;
    state = choose(state, "andrey_meet", "check", "two_stops").state;
    expect(state.quests.q_cafe.status).toBe("active");

    state = run(state, { type: "ENTER_ZONE", zone: "cafe", via: "from_street" }).state;
    const opened = run(state, { type: "INTERACT", targetId: "npc:anna" });
    state = opened.state;
    expect(opened.dialogue?.dialogueId).toBe("anna_cafe");
    state = choose(state, "anna_cafe", "how", "found_metro_shopping").state;
    expect(state.flags["anna.met_cafe"]).toBe(true);
    expect(state.quests.q_cafe.status).toBe("completed");
    expect(state.flags["job.offered"]).toBe(true);
    expect(state.quests.q_job.status).toBe("active");
    expect(relationshipBand(state.npcs.anna.relationship)).not.toBe("stranger");
  });

  it("uses real evidence to record retention reviews", () => {
    let state = throughArrival();
    const result = choose(state, "sasha_after", "start", "review_red");
    state = result.state;
    const retention = state.language.evidence.filter((item) => item.skill === "retention");
    expect(retention.length).toBeGreaterThan(0);
  });
});

describe("save safety and time", () => {
  it("round-trips through validation", () => {
    const { state } = beginGame();
    const parsed = parseGameState(JSON.parse(JSON.stringify(state)));
    expect(parsed).not.toBeNull();
    expect(parsed?.name).toBe("Алекс");
  });

  it("can sleep into the morning and unlock the job trial", () => {
    let { state } = beginGame();
    state.flags["job.offered"] = true;
    state = run(state, { type: "ENTER_ZONE", zone: "apartment", via: "from_courtyard" }).state;
    const result = run(state, { type: "SLEEP" });
    state = result.state;
    expect(state.day).toBe(2);
    expect(state.minutes).toBe(8 * 60 + 30);
    expect(state.flags["job.morning"]).toBe(true);
  });

  it("rejects sleeping anywhere but home", () => {
    const { state } = beginGame();
    const result = run(state, { type: "SLEEP" });
    expect(result.events.some((event) => event.kind === "error")).toBe(true);
    expect(result.state.day).toBe(1);
  });

  it("advances time by ticking and by entering a zone", () => {
    const { state } = beginGame();
    const result = run(state, { type: "TICK", minutes: 15 });
    expect(result.state.minutes).toBe(state.minutes + 15);
  });

  it("does not let arbitrary effects bypass authored content", () => {
    const { state } = beginGame();
    const result = run(state, { type: "CHOOSE", dialogueId: "nope", nodeId: "x", optionId: "y" });
    expect(result.events.some((event) => event.kind === "error")).toBe(true);
    expect(result.state.player.money).toBe(state.player.money);
  });

  it("has valid dialogue node graph for every authored answer", () => {
    for (const dialogue of Object.values(DIALOGUES_BY_ID)) {
      for (const node of Object.values(dialogue.nodes)) {
        for (const option of node.options ?? []) {
          if (option.next)
            expect(
              dialogue.nodes[option.next],
              `${dialogue.id} ${node.id} ${option.id}`,
            ).toBeDefined();
        }
      }
    }
  });
});
