/**
 * MIR — Мир без перевода
 * Shared domain types. Used by the game client, the rules engine and the server.
 */

export type ZoneId = "apartment" | "courtyard" | "street" | "shop" | "cafe" | "metro" | "dombyta";

export type Facing = "up" | "down" | "left" | "right";

export type Skill = "recognition" | "listening" | "reading" | "recall" | "production" | "retention";

export const SKILL_LABELS: Record<Skill, { ru: string; en: string }> = {
  recognition: { ru: "узнавание", en: "recognition" },
  listening: { ru: "понимание на слух", en: "listening" },
  reading: { ru: "понимание текста", en: "reading" },
  recall: { ru: "припоминание", en: "recall" },
  production: { ru: "речь", en: "production" },
  retention: { ru: "память", en: "retention" },
};

export type NpcId =
  | "anna"
  | "lidia"
  | "sasha"
  | "artyom"
  | "nina"
  | "andrey"
  | "kostya"
  | "valentina"
  | "musya"
  | "player"
  | "narrator"
  | "phone";

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/* ------------------------------------------------------------------ */
/* Language learning                                                    */
/* ------------------------------------------------------------------ */

export interface Support {
  translation: boolean;
  hint: boolean;
  audio: boolean;
  typed: boolean;
  aiAssist?: boolean;
}

export const NO_SUPPORT: Support = { translation: false, hint: false, audio: false, typed: false };

export interface LearningEvidence {
  id: string;
  vocab: string;
  skill: Skill;
  /** 0 = not understood, 1 = fully understood. */
  outcome: number;
  at: number;
  source: string;
  support: Support;
  note?: string;
}

export interface VocabMastery {
  vocab: string;
  bySkill: Partial<Record<Skill, number>>;
  overall: number;
  attempts: number;
  lastAt: number;
  dueAt: number;
  strength: number;
}

export interface LearningSettings {
  /** auto adapts to demonstrated knowledge. */
  translations: "auto" | "always" | "onDemand" | "off";
  audioRate: number;
  showTransliteration: boolean;
  hints: boolean;
}

export const DEFAULT_LEARNING_SETTINGS: LearningSettings = {
  translations: "auto",
  audioRate: 0.88,
  showTransliteration: false,
  hints: true,
};

/* ------------------------------------------------------------------ */
/* NPCs                                                                 */
/* ------------------------------------------------------------------ */

export type NpcMemoryKind = "fact" | "kindness" | "promise" | "mistake" | "gift";

export interface NpcMemory {
  textRu: string;
  textEn?: string;
  kind: NpcMemoryKind;
  at: number;
}

export interface NpcState {
  id: NpcId;
  met: boolean;
  relationship: number;
  talkCount: number;
  lastTalkedAt?: number;
  memories: NpcMemory[];
}

export interface NpcLook {
  skin: string;
  hair: string;
  hairStyle: "bob" | "bun" | "short" | "curly" | "beanie" | "cap" | "bald" | "long";
  coat: string;
  coatAlt: string;
  accessory?: "scarf" | "glasses" | "bag" | "earbuds" | "apron" | "vest" | "uniform" | "none";
  accent?: string;
  height?: number;
}

export interface NpcDefinition {
  id: NpcId;
  nameRu: string;
  nameEn: string;
  shortNameRu: string;
  roleRu: string;
  roleEn: string;
  personality: string;
  look: NpcLook;
  portrait: NpcId;
  voice?: { rate: number; pitch: number };
  homeZone: ZoneId;
  defaultDialogue?: string;
  defaultAnimation?: "idle" | "bounce" | "fidget" | "scan" | "tidy" | "cat";
  kindnessStart?: number;
}

/* ------------------------------------------------------------------ */
/* Quests                                                               */
/* ------------------------------------------------------------------ */

export interface Condition {
  flag?: string;
  flagIs?: string | number | boolean;
  notFlag?: string;
  item?: string;
  zone?: ZoneId;
  knowledge?: string;
  visited?: ZoneId;
  questActive?: string;
  questDone?: string;
  questStep?: { quest: string; atLeast: number };
  relationship?: { npc: NpcId; atLeast: number };
  talked?: { npc: NpcId; dialogue?: string };
  any?: Condition[];
  all?: Condition[];
  not?: Condition;
}

export interface QuestStep {
  id: string;
  ru: string;
  en: string;
  hintRu: string;
  hintEn: string;
  done: Condition;
  navTarget?: ZoneId;
  /** Interaction the scene highlights while this step is current. */
  marker?: string;
}

export interface QuestDefinition {
  id: string;
  titleRu: string;
  titleEn: string;
  giver: NpcId;
  summaryRu: string;
  summaryEn: string;
  steps: QuestStep[];
  autoStartWhen?: Condition;
  completionEffects?: Effect[];
}

export type QuestStatus = "active" | "completed";

export interface QuestState {
  id: string;
  status: QuestStatus;
  step: number;
  startedAt: number;
  completedAt?: number;
}

/* ------------------------------------------------------------------ */
/* Effects                                                              */
/* ------------------------------------------------------------------ */

export type Effect =
  | { kind: "flag"; key: string; value?: string | number | boolean }
  | { kind: "knowledge"; key: string }
  | {
      kind: "relationship";
      npc: NpcId;
      delta: number;
      memory?: string;
      memoryEn?: string;
      memoryKind?: NpcMemoryKind;
    }
  | { kind: "item"; id: string; qty?: number }
  | { kind: "money"; delta: number }
  | { kind: "startQuest"; quest: string }
  | { kind: "completeQuest"; quest: string }
  | { kind: "time"; minutes: number }
  | { kind: "event"; event: string }
  | { kind: "unlock"; zone: ZoneId }
  | { kind: "purchase"; items: { id: string; qty?: number }[] }
  | { kind: "notes"; ids: string[] };

/* ------------------------------------------------------------------ */
/* Dialogue                                                             */
/* ------------------------------------------------------------------ */

export type OptionIcon =
  | "speak"
  | "help"
  | "money"
  | "phone"
  | "walk"
  | "food"
  | "metro"
  | "polite"
  | "refuse"
  | "question"
  | "cat"
  | "time"
  | "none";

export interface LanguageNote {
  ru: string;
  en: string;
}

export interface DialogueOption {
  id: string;
  ru: string;
  en: string;
  intent: string;
  icon?: OptionIcon;
  /** Semantic anchor groups for typed answers: every group needs one hit. */
  must?: string[][];
  /** Extra words that make an answer more fluent (not required). */
  nice?: string[];
  /** Canonical phrasings shown as model answers / used for fuzzy similarity. */
  canonical?: string[];
  next?: string;
  effects?: Effect[];
  note?: LanguageNote;
  /** Vocabulary the player actively produced or recognised by picking this option. */
  vocab?: string[];
  /** Marks a spaced-review answer; recorded as long-term retention evidence. */
  retention?: boolean;
  correct?: boolean;
  end?: boolean;
}

export interface DialogueVariant {
  when?: Condition;
  ru: string;
  en?: string;
  stage?: PortraitStage;
}

export type PortraitStage =
  | "neutral"
  | "smile"
  | "warm"
  | "worried"
  | "laugh"
  | "thinking"
  | "stern"
  | "shy"
  | "hurried"
  | "amused";

export interface DialogueNode {
  id: string;
  speaker: NpcId;
  mode: "line" | "choice" | "typed" | "end";
  ru: string;
  en?: string;
  translit?: string;
  stage?: PortraitStage;
  variant?: DialogueVariant[];
  /** For line nodes, the next node. */
  next?: string;
  options?: DialogueOption[];
  typed?: {
    promptRu: string;
    promptEn: string;
    hintRu?: string;
    hintEn?: string;
    unclearRu: string;
    unclearEn: string;
  };
  /** Mark the practiced vocabulary and, for optional review encounters, force skill retention. */
  vocab?: string[];
  skill?: Skill;
  retention?: boolean;
  audio?: "phone" | "radio" | "whisper";
}

export interface DialogueDefinition {
  id: string;
  npc: NpcId;
  zone?: ZoneId;
  titleRu: string;
  titleEn: string;
  entry: string;
  nodes: Record<string, DialogueNode>;
  /** Optional ambient encounter, not tied to a quest. */
  ambient?: boolean;
}

export interface NpcDialogueRule {
  when: Condition;
  dialogue: string;
}

export interface DialogueFeedback {
  accepted: boolean;
  status: "accepted" | "close" | "unclear";
  optionId?: string;
  intent?: string;
  next?: string;
  end?: boolean;
  messageRu?: string;
  messageEn?: string;
  corrections: LanguageNote[];
  matchedRu?: string;
  score?: number;
}

export interface OpenDialogue {
  dialogueId: string;
  nodeId: string;
  npcId: NpcId;
}

/* ------------------------------------------------------------------ */
/* World                                                                */
/* ------------------------------------------------------------------ */

export interface PropDef {
  type: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  scale?: number;
  variant?: string | number;
  text?: string;
  color?: string;
  flip?: boolean;
  depthOffset?: number;
}

export interface InteractionDef {
  id: string;
  zone: ZoneId;
  kind: "object" | "npc" | "exit";
  x: number;
  y: number;
  radius?: number;
  labelRu: string;
  labelEn: string;
  titleRu?: string;
  titleEn?: string;
  textRu?: string;
  textEn?: string;
  icon?: OptionIcon;
  npcId?: NpcId;
  dialogue?: string;
  effects?: Effect[];
  note?: string;
  condition?: Condition;
  lockedRu?: string;
  lockedEn?: string;
  exit?: { to: ZoneId; via: string };
  autoWalk?: boolean;
}

export interface NpcPlacement {
  npcId: NpcId;
  x: number;
  y: number;
  facing?: Facing;
  wander?: Vec2[];
  condition?: Condition;
}

export interface ZoneDefinition {
  id: ZoneId;
  nameRu: string;
  nameEn: string;
  subtitleRu: string;
  subtitleEn: string;
  width: number;
  height: number;
  palette: ZoneId;
  spawns: Record<string, Vec2>;
  defaultSpawn: string;
  obstacles: Rect[];
  interactions: InteractionDef[];
  props: PropDef[];
  npcs: NpcPlacement[];
  ambient: {
    sound: "courtyard" | "street" | "shop" | "cafe" | "metro" | "home" | "dombyta";
    light: "day" | "dusk" | "warm" | "cool" | "fluor" | "metro";
    particles?: "leaves" | "rain" | "dust" | "steam" | "sparkle";
    rainOnWindows?: boolean;
  };
  /** Where the camera should start looking (defaults to spawn). */
  cameraFocus?: Vec2;
}

export interface GiftItemDefinition {
  id: string;
  nameRu: string;
  nameEn: string;
  price: number;
  unitRu?: string;
  descriptionRu: string;
  descriptionEn: string;
  icon: "bread" | "milk" | "tea" | "apple" | "ball" | "key" | "phone" | "note" | "bag";
  shop?: boolean;
  gift?: boolean;
}

export interface VocabEntry {
  id: string;
  ru: string;
  en: string;
  translit: string;
  pos: "noun" | "verb" | "adj" | "phrase" | "adv" | "num" | "pron";
  tags: string[];
  noteRu?: string;
  noteEn?: string;
}

export interface NoteEntry {
  id: string;
  titleRu: string;
  titleEn: string;
  textRu: string;
  textEn: string;
  zone: ZoneId;
}

/* ------------------------------------------------------------------ */
/* Game state                                                           */
/* ------------------------------------------------------------------ */

export interface JournalEntry {
  id: string;
  titleRu: string;
  titleEn: string;
  textRu: string;
  textEn: string;
  at: number;
  day: number;
}

export interface GameState {
  schemaVersion: 1;
  saveId: string;
  createdAt: number;
  updatedAt: number;
  started: boolean;
  name: string;
  day: number;
  minutes: number;
  player: {
    zone: ZoneId;
    x: number;
    y: number;
    facing: Facing;
    money: number;
  };
  inventory: Record<string, number>;
  quests: Record<string, QuestState>;
  npcs: Record<string, NpcState>;
  flags: Record<string, string | number | boolean>;
  knowledge: Record<string, number>;
  notes: string[];
  journal: JournalEntry[];
  language: {
    evidence: LearningEvidence[];
  };
  stats: {
    interactions: number;
    dialogues: number;
    zonesVisited: ZoneId[];
  };
  seenIntro: boolean;
}

/* ------------------------------------------------------------------ */
/* Actions & engine events                                              */
/* ------------------------------------------------------------------ */

export type GameAction =
  | { type: "BEGIN"; name?: string }
  | { type: "ENTER_ZONE"; zone: ZoneId; via?: string }
  | { type: "POSITION"; x: number; y: number; facing?: Facing }
  | { type: "TICK"; minutes: number }
  | { type: "INTERACT"; targetId: string; support?: Support }
  | { type: "CHOOSE"; dialogueId: string; nodeId: string; optionId: string; support?: Support }
  | { type: "TYPE"; dialogueId: string; nodeId: string; text: string; support?: Support }
  | { type: "CLOSE_DIALOGUE" }
  | { type: "BUY"; itemId: string; qty?: number }
  | { type: "SLEEP" }
  | {
      type: "REVIEW";
      vocab: string;
      skill: "recall" | "production" | "retention";
      correct: boolean;
      support?: Support;
    };

export type EngineEvent =
  | { kind: "questStarted"; questId: string; titleRu: string; titleEn: string }
  | { kind: "questStep"; questId: string; stepIndex: number; ru: string; en: string }
  | { kind: "questCompleted"; questId: string; titleRu: string; titleEn: string }
  | { kind: "item"; itemId: string; qty: number; nameRu: string }
  | { kind: "money"; delta: number; total: number }
  | { kind: "relationship"; npcId: NpcId; delta: number; value: number; memory?: string }
  | { kind: "knowledge"; key: string }
  | { kind: "unlocked"; zone: ZoneId; nameRu: string }
  | { kind: "note"; noteId: string; titleRu: string; titleEn: string }
  | { kind: "error"; code: string; messageRu: string; messageEn: string }
  | {
      kind: "notice";
      messageRu: string;
      messageEn: string;
      tone?: "info" | "good" | "gentle";
      titleRu?: string;
      titleEn?: string;
    }
  | { kind: "custom"; event: string }
  | { kind: "evidence"; count: number; vocab: string[] }
  | { kind: "time"; minutes: number; day: number };

export interface ActionResult {
  state: GameState;
  events: EngineEvent[];
  dialogue?: OpenDialogue;
  feedback?: DialogueFeedback;
  transition?: { to: ZoneId; via: string };
  gameOver?: boolean;
}

export interface ZoneExitResult {
  zone: ZoneId;
  spawn: Vec2;
}

export const ZONE_IDS: ZoneId[] = [
  "apartment",
  "courtyard",
  "street",
  "shop",
  "cafe",
  "metro",
  "dombyta",
];

export function relationshipBand(value: number): "stranger" | "acquaintance" | "friend" | "close" {
  if (value >= 70) return "close";
  if (value >= 40) return "friend";
  if (value >= 15) return "acquaintance";
  return "stranger";
}
