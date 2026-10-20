import type {
  Condition,
  DialogueDefinition,
  DialogueNode,
  GameState,
  InteractionDef,
  NpcDialogueRule,
  NpcId,
  QuestDefinition,
  VocabEntry,
  ZoneDefinition,
} from "../types.js";
import { evaluateCondition } from "../engine/conditions.js";
import { VOCABULARY, VOCAB_BY_ID } from "./vocabulary.js";
import { ITEMS, ITEMS_BY_ID, NOTES, NOTES_BY_ID, STARTING_MONEY } from "./items.js";
import { NPCS, NPC_BY_ID, NPC_DIALOGUE_RULES } from "./npcs.js";
import { QUESTS, QUESTS_BY_ID } from "./quests.js";
import { DIALOGUES, DIALOGUES_BY_ID } from "./dialogues.js";
import { ZONES, ZONE_LIST } from "./world.js";

export const CONTENT_VERSION = "0.1.0";

export const CONTENT = {
  version: CONTENT_VERSION,
  vocabulary: VOCABULARY,
  items: ITEMS,
  notes: NOTES,
  npcs: NPCS,
  quests: QUESTS,
  dialogues: DIALOGUES,
  zones: ZONE_LIST,
  startingMoney: STARTING_MONEY,
};

export {
  VOCABULARY,
  VOCAB_BY_ID,
  ITEMS,
  ITEMS_BY_ID,
  NOTES,
  NOTES_BY_ID,
  STARTING_MONEY,
  NPCS,
  NPC_BY_ID,
  NPC_DIALOGUE_RULES,
  QUESTS,
  QUESTS_BY_ID,
  DIALOGUES,
  DIALOGUES_BY_ID,
  ZONES,
  ZONE_LIST,
};

export function getZone(id: string): ZoneDefinition | undefined {
  return ZONES[id];
}

export function getDialogue(id: string | undefined): DialogueDefinition | undefined {
  return id ? DIALOGUES_BY_ID[id] : undefined;
}

export function getDialogueNode(
  dialogueId: string | undefined,
  nodeId: string | undefined,
): DialogueNode | undefined {
  const dialogue = getDialogue(dialogueId);
  if (!dialogue || !nodeId) return undefined;
  return dialogue.nodes[nodeId];
}

export function getQuest(id: string): QuestDefinition | undefined {
  return QUESTS_BY_ID[id];
}

export function getVocab(id: string): VocabEntry | undefined {
  return VOCAB_BY_ID[id];
}

export function findInteraction(zoneId: string, targetId: string): InteractionDef | undefined {
  const zone = ZONES[zoneId];
  if (!zone) return undefined;
  return zone.interactions.find((interaction) => interaction.id === targetId);
}

export function availableNpcIds(zoneId: string, state: GameState): NpcId[] {
  const zone = ZONES[zoneId];
  if (!zone) return [];
  return zone.npcs
    .filter((placement) => evaluateCondition(placement.condition, state))
    .map((placement) => placement.npcId);
}

export function findNpcPlacement(zoneId: string, npcId: string, state: GameState) {
  const zone = ZONES[zoneId];
  if (!zone) return undefined;
  return zone.npcs.find(
    (placement) => placement.npcId === npcId && evaluateCondition(placement.condition, state),
  );
}

/** Authored rule resolution — the single authority for which scene plays. */
export function resolveNpcDialogue(state: GameState, npcId: NpcId): string | undefined {
  const rules: NpcDialogueRule[] = NPC_DIALOGUE_RULES[npcId] ?? [];
  for (const rule of rules) {
    if (evaluateCondition(rule.when, state) && DIALOGUES_BY_ID[rule.dialogue]) {
      return rule.dialogue;
    }
  }
  const def = NPC_BY_ID[npcId];
  if (def?.defaultDialogue && DIALOGUES_BY_ID[def.defaultDialogue]) return def.defaultDialogue;
  return undefined;
}

export function dialogueEntry(dialogue: DialogueDefinition): string {
  return dialogue.entry;
}

export function applyTemplate(text: string, state: Pick<GameState, "name">): string {
  return text.replace(/\{name\}/g, state.name || "друг");
}

/** Conditions used by zones are authored; this is a convenience for the client UI. */
export function isVisible(condition: Condition | undefined, state: GameState): boolean {
  return evaluateCondition(condition, state);
}

export function nearestZone(zones: ZoneDefinition[], currentZone: string) {
  return zones.find((zone) => zone.id === currentZone);
}
