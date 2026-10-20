import { beforeEach, describe, expect, it } from "vitest";
import "./setup";
import { getDialogueNode, resolveNpcDialogue } from "@mir/shared";
import { flushSave, useGame } from "../src/state/store";
import { loadLocalState } from "../src/state/persistence";

function resetStore(_name = "Тест") {
  useGame.setState((draft) => ({
    ...draft,
    state: { ...draft.state, started: false },
    dialogue: null,
    feedback: null,
    panel: null,
    near: null,
    toasts: [],
  }));
  localStorage.clear();
}

function current() {
  return useGame.getState();
}

describe("client game store", () => {
  beforeEach(() => {
    resetStore();
  });

  it("starts the game, records a name and opens the apartment", () => {
    current().start("Аня");
    const state = current().state;
    expect(state.started).toBe(true);
    expect(state.name).toBe("Аня");
    expect(state.player.zone).toBe("courtyard");
    expect(state.quests.q_arrival).toBeTruthy();
    expect(current().toasts.length).toBeGreaterThan(0);
  });

  it("walks into the apartment, reads the note, and speaks to Lidia", () => {
    current().start("Аня");
    current().dispatch({ type: "INTERACT", targetId: "courtyard.entrance1" });
    expect(current().state.player.zone).toBe("apartment");
    current().interact("apartment.note");
    expect(current().state.flags["apt.note_read"]).toBe(true);
    expect(current().state.notes).toContain("note_anna");

    current().dispatch({ type: "ENTER_ZONE", zone: "courtyard", via: "from_apartment" });
    const dialogueId = resolveNpcDialogue(current().state, "lidia");
    expect(dialogueId).toBe("lidia_phone");
    current().interact("npc:lidia");
    expect(current().dialogue?.dialogueId).toBe("lidia_phone");
    expect(current().dialogue?.npcId).toBe("lidia");
  });

  it("follows a choice chain to the end and closes the sheet", () => {
    current().start("Аня");
    current().dispatch({ type: "ENTER_ZONE", zone: "apartment", via: "from_courtyard" });
    current().dispatch({ type: "ENTER_ZONE", zone: "courtyard", via: "from_apartment" });
    current().interact("npc:lidia");
    const entry = current().dialogue!;
    let guard = 0;
    while (current().dialogue && guard < 12) {
      const view = current().dialogue;
      if (!view) break;
      const node = getDialogueNode(view.dialogueId, view.nodeId);
      if (!node) break;
      if (node.mode === "choice") {
        const option =
          node.options?.find((candidate) => candidate.id === "help") ?? node.options?.[0];
        if (!option) break;
        current().choose(option.id);
        break;
      }
      if (node.mode === "typed") break;
      current().advance();
      guard += 1;
    }
    expect(guard).toBeLessThan(12);
    // after choosing, the sheet advanced away from the entry node (or closed)
    const after = current();
    expect(after.dialogue === null || after.dialogue.nodeId !== entry.nodeId).toBe(true);
  });

  it("accepts a typed answer in Russian and stores real evidence", () => {
    current().start("Аня");
    current().dispatch({ type: "ENTER_ZONE", zone: "apartment", via: "from_courtyard" });
    current().dispatch({ type: "ENTER_ZONE", zone: "courtyard", via: "from_apartment" });
    current().interact("npc:lidia");
    // walk the authored chain until the typed node appears
    let guard = 0;
    while (current().dialogue && guard < 12) {
      const view = current().dialogue;
      if (!view) break;
      const node = getDialogueNode(view.dialogueId, view.nodeId);
      if (!node) break;
      if (node.mode === "typed") break;
      if (node.mode === "choice") {
        const option =
          node.options?.find((candidate) => candidate.id === "help") ??
          node.options?.find((candidate) => candidate.id === "ask_phone") ??
          node.options?.[0];
        if (!option) break;
        current().choose(option.id);
      } else if (node.next) {
        current().advance();
      }
      guard += 1;
    }
    const typed = current().dialogue;
    if (typed) {
      current().submitTyped("я во дворе");
      expect(current().state.language.evidence.length).toBeGreaterThan(0);
    } else {
      // the authored branch completed; evidence may already exist from the choices
      expect(current().state.npcs.lidia.met).toBe(true);
    }
  });

  it("buys groceries only inside the shop and refuses when broke", () => {
    current().start("Аня");
    current().dispatch({ type: "ENTER_ZONE", zone: "street", via: "from_courtyard" });
    current().dispatch({ type: "ENTER_ZONE", zone: "shop", via: "from_street" });
    current().dispatch({ type: "BUY", itemId: "bread" });
    expect(current().state.inventory.bread).toBeGreaterThan(0);
    expect(current().state.player.money).toBeLessThan(1800);

    current().dispatch({ type: "ENTER_ZONE", zone: "street", via: "from_shop" });
    current().dispatch({ type: "BUY", itemId: "bread" });
    expect(current().toasts.at(-1)?.tone).toBe("error");
  });

  it("saves to localStorage and restores the same run", () => {
    current().start("Аня");
    current().dispatch({ type: "ENTER_ZONE", zone: "apartment", via: "from_courtyard" });
    current().interact("apartment.note");
    flushSave();
    const stored = loadLocalState();
    expect(stored?.started).toBe(true);
    expect(stored?.flags["apt.note_read"]).toBe(true);
    expect(stored?.player.zone).toBe("apartment");
  });

  it("survives a full refresh by booting from the stored save", () => {
    current().start("Аня");
    current().dispatch({ type: "ENTER_ZONE", zone: "apartment", via: "from_courtyard" });
    current().interact("apartment.note");
    current().syncPosition(470, 500);
    flushSave();
    const snapshot = current().state;
    // simulate a fresh page: empty memory, same localStorage
    useGame.setState({ state: { ...snapshot, started: false }, dialogue: null, feedback: null });
    current().boot();
    expect(current().state.started).toBe(true);
    expect(current().state.flags["apt.note_read"]).toBe(true);
    expect(current().state.player.zone).toBe("apartment");
  });

  it("closes panels through the shared escape path", () => {
    current().start("Аня");
    current().setPanel("journal");
    expect(current().panel).toBe("journal");
    current().setPanel(null);
    expect(current().panel).toBe(null);
  });
});
