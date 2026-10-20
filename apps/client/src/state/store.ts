import { create } from "zustand";
import {
  DIALOGUES_BY_ID,
  NPC_BY_ID,
  QUESTS_BY_ID,
  applyAction,
  createInitialState,
  getDialogueNode,
  learningSummary,
  type ActionResult,
  type DialogueFeedback,
  type EngineEvent,
  type GameAction,
  type GameState,
  type LearningSettings,
  type QuestDefinition,
  type Support,
} from "@mir/shared";
import {
  DEFAULT_SETTINGS,
  clearLocalState,
  interpretWithServer,
  loadLocalState,
  loadSettings,
  loadSync,
  openSession,
  pullRemote,
  pushSnapshot,
  saveLocalState,
  saveSettings,
  saveSync,
} from "./persistence";

export type PanelId = "journal" | "phone" | "map" | "mastery" | null;

export interface Toast {
  id: number;
  titleRu?: string;
  titleEn?: string;
  textRu: string;
  textEn?: string;
  tone: "info" | "good" | "gentle" | "error";
  questId?: string;
}

export interface NearTarget {
  id: string;
  kind: "npc" | "object" | "exit";
  labelRu: string;
  labelEn: string;
  npcId?: string;
  distance: number;
}

export interface DialogueView {
  dialogueId: string;
  nodeId: string;
  npcId: string;
}

export interface AiSuggestion {
  optionId: string | null;
  text: string;
  confidence: number;
  note?: string | null;
  pending: boolean;
}

interface UiState {
  dialogue: DialogueView | null;
  feedback: DialogueFeedback | null;
  lastAnswer: string | null;
  panel: PanelId;
  near: NearTarget | null;
  toasts: Toast[];
  settings: LearningSettings;
  soundOn: boolean;
  support: Pick<Support, "translation" | "hint" | "audio">;
  ai: AiSuggestion | null;
  sync: {
    status: "off" | "connecting" | "online" | "error";
    version: number;
    mode?: string;
    ai: boolean;
    lastAt?: number;
  };
  introOpen: boolean;
  sleeping: boolean;
  paused: boolean;
  sleepPrompt: boolean;
}

export interface GameStore extends UiState {
  state: GameState;
  boot: () => void;
  start: (name: string) => void;
  reset: (name: string) => void;
  dispatch: (action: GameAction) => ActionResult;
  interact: (targetId: string) => void;
  choose: (optionId: string) => void;
  submitTyped: (text: string) => void;
  advance: () => void;
  closeDialogue: () => void;
  setPanel: (panel: PanelId) => void;
  setNear: (near: NearTarget | null) => void;
  dismissToast: (id: number) => void;
  showNotice: (toast: Omit<Toast, "id">) => void;
  setSettings: (patch: Partial<LearningSettings>) => void;
  toggleSound: () => void;
  markSupport: (key: "translation" | "hint" | "audio") => void;
  askAi: () => Promise<void>;
  acceptAi: () => void;
  syncNow: (opts?: { replace?: boolean }) => Promise<void>;
  sleep: () => void;
  setIntro: (open: boolean) => void;
  setPaused: (paused: boolean) => void;
  setSleepPrompt: (open: boolean) => void;
  syncPosition: (x: number, y: number, facing?: GameState["player"]["facing"]) => void;
  questForStep: () => { quest: QuestDefinition; stepIndex: number } | null;
}

let toastSeq = 1;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let syncing = false;

function toastFromEvent(event: EngineEvent): Toast | null {
  switch (event.kind) {
    case "questStarted":
      return {
        id: toastSeq++,
        titleRu: "Новое задание",
        titleEn: "New task",
        textRu: event.titleRu,
        textEn: event.titleEn,
        tone: "good",
        questId: event.questId,
      };
    case "questStep":
      return {
        id: toastSeq++,
        titleRu: "Задание обновилось",
        titleEn: "Task updated",
        textRu: event.ru,
        textEn: event.en,
        tone: "info",
        questId: event.questId,
      };
    case "questCompleted":
      return {
        id: toastSeq++,
        titleRu: "Сделано",
        titleEn: "Done",
        textRu: event.titleRu,
        textEn: event.titleEn,
        tone: "good",
        questId: event.questId,
      };
    case "notice":
      return {
        id: toastSeq++,
        titleRu: event.titleRu,
        titleEn: event.titleEn,
        textRu: event.messageRu,
        textEn: event.messageEn,
        tone: event.tone === "gentle" ? "gentle" : event.tone === "good" ? "good" : "info",
      };
    case "unlocked":
      return {
        id: toastSeq++,
        titleRu: "Новое место",
        titleEn: "New place",
        textRu: event.nameRu,
        tone: "good",
      };
    case "error":
      return {
        id: toastSeq++,
        titleRu: "Не получилось",
        titleEn: "Not quite",
        textRu: event.messageRu,
        textEn: event.messageEn,
        tone: "error",
      };
    case "relationship":
      if (event.delta > 0) {
        return {
          id: toastSeq++,
          textRu: `${NPC_BY_ID[event.npcId]?.shortNameRu ?? ""}: ${event.memory ?? "теплее"}`,
          tone: "good",
        };
      }
      return null;
    case "custom":
      return event.event === "chapter.instructions"
        ? {
            id: toastSeq++,
            titleRu: "Глава первая",
            titleEn: "Chapter one",
            textRu: "Ты дозвонился. Город начал отвечать.",
            textEn: "You got through. The city answered.",
            tone: "good",
          }
        : null;
    default:
      return null;
  }
}

function initialUi(): UiState {
  return {
    dialogue: null,
    feedback: null,
    lastAnswer: null,
    panel: null,
    near: null,
    toasts: [],
    settings: loadSettings(),
    soundOn: true,
    support: { translation: false, hint: false, audio: false },
    ai: null,
    sync: { status: "off", version: 0, ai: false },
    introOpen: false,
    sleeping: false,
    paused: false,
    sleepPrompt: false,
  };
}

export const useGame = create<GameStore>((set, get) => ({
  state: createInitialState(),
  ...initialUi(),

  boot: () => {
    const local = loadLocalState();
    if (local?.started) {
      set({ state: local });
    }
    void get().syncNow();
  },

  start: (name) => {
    const current = get().state;
    if (!current.started) {
      get().dispatch({ type: "BEGIN", name });
    }
    set({ introOpen: false });
    void get().syncNow({ replace: true });
  },

  reset: (name) => {
    clearLocalState();
    const fresh = createInitialState();
    set({
      state: fresh,
      dialogue: null,
      feedback: null,
      panel: null,
      near: null,
      toasts: [],
      ai: null,
      introOpen: false,
    });
    get().dispatch({ type: "BEGIN", name: name || "Алекс" });
    void get().syncNow({ replace: true });
  },

  dispatch: (action) => {
    const prev = get().state;
    const result = applyAction(prev, action, Date.now());
    const toasts = result.events
      .map(toastFromEvent)
      .filter((toast): toast is Toast => Boolean(toast));
    let dialogue = get().dialogue;
    let feedback = get().feedback;
    if (result.dialogue) {
      dialogue = {
        dialogueId: result.dialogue.dialogueId,
        nodeId: result.dialogue.nodeId,
        npcId: result.dialogue.npcId,
      };
      feedback = null;
    }
    if (result.feedback) feedback = result.feedback;

    set((draft) => ({
      state: result.state,
      toasts: [...draft.toasts, ...toasts].slice(-4),
      dialogue,
      feedback,
      support: result.dialogue ? { translation: false, hint: false, audio: false } : draft.support,
    }));

    if (result.transition) {
      get().dispatch({
        type: "ENTER_ZONE",
        zone: result.transition.to,
        via: result.transition.via,
      });
    }

    if (action.type === "SLEEP") {
      const slept = get().state.day > prev.day;
      if (slept) set({ sleeping: false });
    }
    if (action.type === "ENTER_ZONE") set({ sleepPrompt: false });
    if (result.events.some((event) => event.kind === "custom" && event.event === "sleep.offer")) {
      set({ sleepPrompt: true });
    }

    scheduleSave();
    scheduleSync();
    return result;
  },

  interact: (targetId) => {
    const { dialogue, panel } = get();
    if (dialogue || panel) return;
    get().dispatch({ type: "INTERACT", targetId });
  },

  choose: (optionId) => {
    const { dialogue, support } = get();
    if (!dialogue) return;
    const result = get().dispatch({
      type: "CHOOSE",
      dialogueId: dialogue.dialogueId,
      nodeId: dialogue.nodeId,
      optionId,
      support: { ...support, typed: false },
    });
    const feedback = result.feedback;
    if (feedback?.accepted) {
      if (feedback.next) {
        set((draft) => ({
          dialogue: draft.dialogue ? { ...draft.dialogue, nodeId: feedback.next as string } : null,
          support: { translation: false, hint: false, audio: false },
        }));
      } else {
        set({ dialogue: null });
      }
    }
  },

  submitTyped: (text) => {
    const { dialogue, support } = get();
    if (!dialogue) return;
    set({ lastAnswer: text, ai: null });
    const result = get().dispatch({
      type: "TYPE",
      dialogueId: dialogue.dialogueId,
      nodeId: dialogue.nodeId,
      text,
      support: { ...support, typed: true },
    });
    const feedback = result.feedback;
    if (feedback?.accepted) {
      if (feedback.next) {
        set((draft) => ({
          dialogue: draft.dialogue ? { ...draft.dialogue, nodeId: feedback.next as string } : null,
          support: { translation: false, hint: false, audio: false },
        }));
      } else {
        set({ dialogue: null });
      }
    }
  },

  advance: () => {
    const { dialogue } = get();
    if (!dialogue) return;
    const node = getDialogueNode(dialogue.dialogueId, dialogue.nodeId);
    if (!node) {
      get().closeDialogue();
      return;
    }
    if (node.next) {
      set((draft) => ({
        dialogue: draft.dialogue ? { ...draft.dialogue, nodeId: node.next as string } : null,
        feedback: null,
        support: { translation: false, hint: false, audio: false },
      }));
      return;
    }
    get().closeDialogue();
  },

  closeDialogue: () => set({ dialogue: null, feedback: null, ai: null, lastAnswer: null }),

  setPanel: (panel) => set({ panel }),
  setNear: (near) => {
    const previous = get().near;
    if (previous?.id === near?.id) return;
    set({ near });
  },
  dismissToast: (id) =>
    set((draft) => ({ toasts: draft.toasts.filter((toast) => toast.id !== id) })),
  showNotice: (toast) =>
    set((draft) => ({ toasts: [...draft.toasts, { ...toast, id: toastSeq++ }].slice(-4) })),

  setSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    saveSettings(settings);
    set({ settings });
  },

  toggleSound: () => set({ soundOn: !get().soundOn }),

  markSupport: (key) => set((draft) => ({ support: { ...draft.support, [key]: true } })),

  askAi: async () => {
    const { dialogue, lastAnswer, sync } = get();
    if (!dialogue || !lastAnswer) return;
    const meta = loadSync();
    if (!meta || !sync.ai) return;
    set({ ai: { optionId: null, text: "", confidence: 0, pending: true } });
    const response = await interpretWithServer(
      meta,
      dialogue.dialogueId,
      dialogue.nodeId,
      lastAnswer,
    );
    const node = getDialogueNode(dialogue.dialogueId, dialogue.nodeId);
    const option = response?.optionId
      ? node?.options?.find((candidate) => candidate.id === response.optionId)
      : undefined;
    if (!option) {
      set({ ai: { optionId: null, text: "", confidence: 0, pending: false } });
      return;
    }
    set({
      ai: {
        optionId: option.id,
        text: option.ru,
        confidence: response?.confidence ?? 0,
        note: response?.note ?? null,
        pending: false,
      },
    });
  },

  acceptAi: () => {
    const suggestion = get().ai;
    if (!suggestion?.optionId) return;
    set((draft) => ({ ai: null, support: { ...draft.support, hint: true } }));
    get().choose(suggestion.optionId);
  },

  syncNow: async (opts) => {
    if (syncing) return;
    syncing = true;
    try {
      const meta = loadSync();
      let active = meta;
      set({
        sync: { status: "connecting", version: active?.version ?? 0, ai: active?.ai ?? false },
      });
      if (!active) {
        active = await openSession(get().state.started ? get().state.name : undefined);
      }
      if (!active) {
        set({ sync: { status: "off", version: 0, ai: false } });
        return;
      }
      if (!get().state.started) {
        const remote = await pullRemote(active);
        if (remote?.state?.started) {
          set({ state: remote.state });
          active = { ...active, version: remote.version };
          saveSync(active);
          saveLocalState(remote.state);
        }
      }
      if (!get().state.started) {
        set({
          sync: {
            status: "online",
            version: active.version,
            mode: active.mode,
            ai: active.ai,
            lastAt: Date.now(),
          },
        });
        return;
      }
      const result = await pushSnapshot(active, get().state, opts?.replace);
      if (result.ok) {
        active = { ...active, version: result.version };
        saveSync(active);
        set({
          sync: {
            status: "online",
            version: result.version,
            mode: active.mode,
            ai: active.ai,
            lastAt: Date.now(),
          },
        });
        return;
      }
      if (result.conflict && !opts?.replace) {
        const remote = await pullRemote(active);
        if (remote) {
          const retryMeta = { ...active, version: remote.version };
          const retry = await pushSnapshot(retryMeta, get().state, true);
          if (retry.ok) {
            saveSync({ ...retryMeta, version: retry.version });
            set({
              sync: {
                status: "online",
                version: retry.version,
                mode: active.mode,
                ai: active.ai,
                lastAt: Date.now(),
              },
            });
            return;
          }
        }
      }
      if (result.status === 401) {
        saveSync(null);
      }
      set((draft) => ({ sync: { ...draft.sync, status: "error" } }));
    } finally {
      syncing = false;
    }
  },

  sleep: () => {
    if (get().state.player.zone !== "apartment") {
      get().showNotice({
        titleRu: "Не здесь",
        titleEn: "Not here",
        textRu: "Спать лучше дома.",
        textEn: "Better to sleep at home.",
        tone: "gentle",
      });
      return;
    }
    set({ sleeping: true, sleepPrompt: false, panel: null });
    setTimeout(() => {
      get().dispatch({ type: "SLEEP" });
      set({ sleeping: false });
    }, 1100);
  },

  setIntro: (open) => set({ introOpen: open }),
  setPaused: (paused) => set({ paused }),
  setSleepPrompt: (open) => set({ sleepPrompt: open }),

  syncPosition: (x, y, facing) => {
    set((draft) => ({
      state: {
        ...draft.state,
        player: { ...draft.state.player, x, y, facing: facing ?? draft.state.player.facing },
        updatedAt: Date.now(),
      },
    }));
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveLocalState(useGame.getState().state);
      saveTimer = null;
    }, 200);
  },

  questForStep: () => {
    const state = get().state;
    const active = Object.values(state.quests)
      .filter((quest) => quest.status === "active")
      .sort((a, b) => a.startedAt - b.startedAt);
    const next = active[0];
    if (!next) return null;
    const definition = QUESTS_BY_ID[next.id];
    if (!definition) return null;
    return { quest: definition, stepIndex: Math.min(next.step, definition.steps.length - 1) };
  },
}));

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveLocalState(useGame.getState().state);
    saveTimer = null;
  }, 200);
}

function scheduleSync(): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    void useGame.getState().syncNow();
    syncTimer = null;
  }, 3500);
}

export function flushSave(): void {
  saveLocalState(useGame.getState().state);
}

export function currentSummary() {
  return learningSummary(useGame.getState().state);
}

export function dialogueNode() {
  const { dialogue } = useGame.getState();
  return dialogue ? getDialogueNode(dialogue.dialogueId, dialogue.nodeId) : undefined;
}

export function dialogueTitle() {
  const { dialogue } = useGame.getState();
  return dialogue ? DIALOGUES_BY_ID[dialogue.dialogueId]?.titleRu : undefined;
}

export { DEFAULT_SETTINGS };
