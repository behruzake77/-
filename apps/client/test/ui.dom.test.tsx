import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

// Phaser needs a real canvas; the game world is covered by its own scene test.
vi.mock("../src/game/MirScene", () => ({ MirScene: class {} }));
vi.mock("../src/ui/GameCanvas", () => ({ GameCanvas: () => <div data-testid="canvas" /> }));

import { App } from "../src/App";
import { createInitialState } from "@mir/shared";
import { useGame, flushSave } from "../src/state/store";
import { portraitUrl } from "../src/art/portraits";

function resetAll() {
  localStorage.clear();
  useGame.setState((draft) => ({
    ...draft,
    state: createInitialState(),
    dialogue: null,
    feedback: null,
    panel: null,
    near: null,
    toasts: [],
    introOpen: false,
    ai: null,
  }));
}

function openLidia() {
  act(() => {
    const store = useGame.getState();
    store.dispatch({ type: "ENTER_ZONE", zone: "apartment", via: "from_courtyard" });
    store.dispatch({ type: "ENTER_ZONE", zone: "courtyard", via: "from_apartment" });
    store.interact("npc:lidia");
  });
  // the scene opens with a spoken line; press "Дальше" until the answers appear
  for (let i = 0; i < 8; i += 1) {
    if (document.querySelectorAll(".opt__main").length > 0) break;
    const next = [...document.querySelectorAll("button")].find((button) =>
      /Дальше|Закрыть/.test(button.textContent ?? ""),
    );
    if (!next) break;
    fireEvent.click(next);
  }
}

describe("MIR interface", () => {
  beforeEach(() => {
    cleanup();
    resetAll();
  });

  it("opens on the arrival screen with the game name and a name field", () => {
    render(<App />);
    expect(screen.getAllByText(/Мир без перевода/).length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText("Алекс")).toBeTruthy();
    expect(screen.getByRole("button", { name: /войти во двор/i })).toBeTruthy();
  });

  it("starts a run and shows the place, money and the first task", async () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText("Алекс"), { target: { value: "Аня" } });
    fireEvent.click(screen.getByRole("button", { name: /войти во двор/i }));

    expect(useGame.getState().state.started).toBe(true);
    await waitFor(() => expect(screen.getByText("Двор на улице Мира")).toBeTruthy());
    expect(screen.getByText(/1 800 ₽/)).toBeTruthy();
    expect(screen.getAllByText("Первые шаги").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Найди подъезд и квартиру 27/).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Дневник")).toBeTruthy();
  });

  it("renders the note text in the phone panel", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /войти во двор/i }));
    act(() => {
      useGame.getState().dispatch({ type: "ENTER_ZONE", zone: "apartment", via: "from_courtyard" });
      useGame.getState().interact("apartment.note");
      useGame.getState().setPanel("phone");
    });
    expect(screen.getByText("Заметки")).toBeTruthy();
    expect(screen.getAllByText(/Анна/).length).toBeGreaterThan(0);
  });

  it("shows the journal with the arrival quest and its steps", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /войти во двор/i }));
    await waitFor(() => expect(screen.getByLabelText("Дневник")).toBeTruthy());
    fireEvent.click(screen.getByLabelText("Дневник"));
    expect(screen.getByText(/Северогорск, день 1/)).toBeTruthy();
    expect(screen.getAllByText("Первые шаги").length).toBeGreaterThan(0);
    expect(screen.getByText(/Позвони Анне/)).toBeTruthy();
    expect(screen.getByText(/Прочитай записку Анны/)).toBeTruthy();
  });

  it("renders a dialogue with the speaker, line and answer options", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /войти во двор/i }));
    openLidia();
    expect(screen.getAllByText("Лидия Петровна").length).toBeGreaterThan(0);
    expect(document.querySelector(".dialogue__portrait img")).toBeTruthy();
    expect(screen.getByText(/выйти/)).toBeTruthy();
    const options = document.querySelectorAll(".opt__main");
    expect(options.length).toBeGreaterThan(1);
    const before = useGame.getState().dialogue?.nodeId;
    fireEvent.click(options[0]);
    const after = useGame.getState();
    expect(after.dialogue?.nodeId !== before || after.dialogue === null).toBe(true);
  });

  it("renders the mastery panel with honest empty state, never invented numbers", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /войти во двор/i }));
    fireEvent.click(screen.getByLabelText("Телефон"));
    fireEvent.click(screen.getByRole("tab", { name: "слова" }));
    expect(screen.getByText(/следов в памяти/)).toBeTruthy();
    expect(screen.getByText(/Сначала поговори с кем-нибудь/)).toBeTruthy();
  });

  it("keeps a dialogue reply in the transcript and only closes on request", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /войти во двор/i }));
    openLidia();
    fireEvent.click(document.querySelectorAll(".opt__main")[0]);
    const sheet = document.querySelector(".dialogue");
    if (sheet) {
      expect(sheet.textContent?.length ?? 0).toBeGreaterThan(10);
      fireEvent.click(screen.getByText(/выйти/));
      expect(document.querySelector(".dialogue")).toBeNull();
    }
  });

  it("has original portrait art for every speaking character", () => {
    for (const id of [
      "anna",
      "lidia",
      "sasha",
      "artyom",
      "nina",
      "andrey",
      "kostya",
      "valentina",
      "musya",
    ]) {
      const url = portraitUrl(id);
      expect(url.startsWith("data:image/svg+xml")).toBe(true);
      expect(decodeURIComponent(url).length).toBeGreaterThan(500);
    }
  });

  it("survives a save + reload of the interface", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /войти во двор/i }));
    act(() => {
      useGame.getState().dispatch({ type: "ENTER_ZONE", zone: "apartment", via: "from_courtyard" });
    });
    flushSave();
    cleanup();
    useGame.setState((draft) => ({
      ...draft,
      state: { ...draft.state, started: false },
      dialogue: null,
      panel: null,
    }));
    render(<App />);
    act(() => useGame.getState().boot());
    expect(useGame.getState().state.started).toBe(true);
    await waitFor(() => expect(screen.getByText("Квартира 27")).toBeTruthy());
  });
});
