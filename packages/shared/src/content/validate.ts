import type {
  Condition,
  DialogueDefinition,
  Effect,
  QuestDefinition,
  ZoneDefinition,
} from "../types.js";
import { NPCS, NPC_DIALOGUE_RULES } from "./npcs.js";
import { DIALOGUES, DIALOGUES_BY_ID } from "./dialogues.js";
import { QUESTS, QUESTS_BY_ID } from "./quests.js";
import { ITEMS_BY_ID, NOTES_BY_ID } from "./items.js";
import { VOCAB_BY_ID } from "./vocabulary.js";
import { ZONE_LIST, ZONES } from "./world.js";

/**
 * Content integrity checks. Run in tests and at server boot so authored
 * references can never silently break the game.
 */
export function validateContent(): string[] {
  const errors: string[] = [];
  const npcIds = new Set([...NPCS.map((npc) => npc.id), "narrator", "player", "phone"]);
  const vocabIds = new Set(Object.keys(VOCAB_BY_ID));
  const itemIds = new Set(Object.keys(ITEMS_BY_ID));
  const noteIds = new Set(Object.keys(NOTES_BY_ID));
  const questIds = new Set(QUESTS.map((quest) => quest.id));
  const zoneIds = new Set(ZONE_LIST.map((zone) => zone.id));
  const dialogueIds = new Set(DIALOGUES.map((dialogue) => dialogue.id));

  if (NPCS.length < 5) errors.push(`Expected at least five NPCs, found ${NPCS.length}.`);
  if (QUESTS.length < 3) errors.push(`Expected at least three quests, found ${QUESTS.length}.`);
  if (DIALOGUES.length < 10)
    errors.push(`Expected a substantial dialogue set, found ${DIALOGUES.length}.`);

  const checkNpc = (npc: string, context: string) => {
    if (!npcIds.has(npc as never)) errors.push(`${context}: unknown npc "${npc}"`);
  };
  const checkVocab = (vocab: string, context: string) => {
    if (!vocabIds.has(vocab)) errors.push(`${context}: unknown vocabulary "${vocab}"`);
  };
  const checkItem = (item: string, context: string) => {
    if (!itemIds.has(item)) errors.push(`${context}: unknown item "${item}"`);
  };
  const checkNote = (note: string, context: string) => {
    if (!noteIds.has(note)) errors.push(`${context}: unknown note "${note}"`);
  };
  const checkZone = (zone: string, context: string) => {
    if (!zoneIds.has(zone as never)) errors.push(`${context}: unknown zone "${zone}"`);
  };
  const checkQuest = (quest: string, context: string) => {
    if (!questIds.has(quest)) errors.push(`${context}: unknown quest "${quest}"`);
  };

  const checkCondition = (condition: Condition | undefined, context: string) => {
    if (!condition) return;
    if (condition.questActive) checkQuest(condition.questActive, context);
    if (condition.questDone) checkQuest(condition.questDone, context);
    if (condition.questStep) checkQuest(condition.questStep.quest, context);
    if (condition.relationship) checkNpc(condition.relationship.npc, context);
    if (condition.talked) checkNpc(condition.talked.npc, context);
    if (condition.visited) checkZone(condition.visited, context);
    if (condition.zone) checkZone(condition.zone, context);
    if (condition.item) checkItem(condition.item, context);
    condition.all?.forEach((c) => {
      checkCondition(c, context);
    });
    condition.any?.forEach((c) => {
      checkCondition(c, context);
    });
    if (condition.not) checkCondition(condition.not, context);
  };

  const checkEffect = (effect: Effect, context: string) => {
    switch (effect.kind) {
      case "relationship":
        checkNpc(effect.npc, context);
        break;
      case "item":
        checkItem(effect.id, context);
        break;
      case "purchase":
        effect.items.forEach((item) => {
          checkItem(item.id, context);
        });
        break;
      case "startQuest":
      case "completeQuest":
        checkQuest(effect.quest, context);
        break;
      case "unlock":
        checkZone(effect.zone, context);
        break;
      case "notes":
        effect.ids.forEach((note) => {
          checkNote(note, context);
        });
        break;
      default:
        break;
    }
  };

  /* Dialogues */
  const seenDialogueIds = new Set<string>();
  for (const dialogue of DIALOGUES) {
    if (seenDialogueIds.has(dialogue.id)) errors.push(`Duplicate dialogue id "${dialogue.id}"`);
    seenDialogueIds.add(dialogue.id);
    checkNpc(dialogue.npc, `dialogue ${dialogue.id}`);
    if (dialogue.zone) checkZone(dialogue.zone, `dialogue ${dialogue.id}`);
    if (!dialogue.nodes[dialogue.entry]) {
      errors.push(`Dialogue ${dialogue.id}: entry node "${dialogue.entry}" missing`);
    }
    const nodeIds = new Set(Object.keys(dialogue.nodes));
    for (const node of Object.values(dialogue.nodes)) {
      const context = `dialogue ${dialogue.id}#${node.id}`;
      if (node.id !== dialogue.nodes[node.id]?.id) errors.push(`${context}: node key/id mismatch`);
      checkNpc(node.speaker, context);
      if (node.mode === "choice" && (!node.options || node.options.length < 1)) {
        errors.push(`${context}: choice node without options`);
      }
      if (node.mode === "typed") {
        if (!node.typed) errors.push(`${context}: typed node without typed config`);
        if (!node.options?.length) errors.push(`${context}: typed node without answer options`);
        const anyCorrect = node.options?.some((option) => option.correct !== false);
        if (!anyCorrect) errors.push(`${context}: typed node with no acceptable answer`);
        for (const option of node.options ?? []) {
          if (!option.must?.length && !option.canonical?.length) {
            errors.push(`${context}#${option.id}: typed option needs semantic anchors`);
          }
        }
      }
      if (node.mode !== "typed" && node.mode !== "end" && !node.next && !node.options?.length) {
        errors.push(`${context}: line node without next`);
      }
      if (node.next && !nodeIds.has(node.next))
        errors.push(`${context}: next "${node.next}" missing`);
      for (const vocab of node.vocab ?? []) checkVocab(vocab, context);
      for (const variant of node.variant ?? []) checkCondition(variant.when, context);
      for (const option of node.options ?? []) {
        const optionContext = `${context}#${option.id}`;
        if (option.next && !nodeIds.has(option.next)) {
          errors.push(`${optionContext}: next "${option.next}" missing`);
        }
        for (const vocab of option.vocab ?? []) checkVocab(vocab, optionContext);
        for (const effect of option.effects ?? []) checkEffect(effect, optionContext);
      }
    }
    const answerable = Object.values(dialogue.nodes).some(
      (node) => node.mode === "choice" || node.mode === "typed",
    );
    const correctCount = Object.values(dialogue.nodes).reduce(
      (count, node) =>
        count + (node.options?.filter((option) => option.correct !== false).length ?? 0),
      0,
    );
    if (answerable && correctCount === 0) {
      errors.push(`Dialogue ${dialogue.id}: no acceptable answers authored`);
    }
  }

  /* NPCs & rules */
  for (const npc of NPCS) {
    if (npc.defaultDialogue && !dialogueIds.has(npc.defaultDialogue)) {
      errors.push(`NPC ${npc.id}: default dialogue "${npc.defaultDialogue}" missing`);
    }
    for (const rule of NPC_DIALOGUE_RULES[npc.id] ?? []) {
      if (!dialogueIds.has(rule.dialogue)) {
        errors.push(`NPC ${npc.id}: rule dialogue "${rule.dialogue}" missing`);
      }
      checkCondition(rule.when, `NPC ${npc.id} rule`);
    }
  }

  /* Quests */
  for (const quest of QUESTS) {
    checkNpc(quest.giver, `quest ${quest.id}`);
    if (!quest.steps.length) errors.push(`Quest ${quest.id}: no steps`);
    for (const step of quest.steps) {
      checkCondition(step.done, `quest ${quest.id}#${step.id}`);
      if (step.navTarget) checkZone(step.navTarget, `quest ${quest.id}#${step.id}`);
    }
    checkCondition(quest.autoStartWhen, `quest ${quest.id} autoStart`);
    for (const effect of quest.completionEffects ?? [])
      checkEffect(effect, `quest ${quest.id} completion`);
  }

  /* Zones */
  const interactionIds = new Set<string>();
  const zone: ZoneDefinition[] = ZONE_LIST;
  for (const z of zone) {
    if (ZONES[z.id] !== z) errors.push(`Zone registry mismatch for ${z.id}`);
    for (const visibleNpc of z.npcs) {
      checkNpc(visibleNpc.npcId, `zone ${z.id} npc`);
      checkCondition(visibleNpc.condition, `zone ${z.id} npc ${visibleNpc.npcId}`);
      if (
        visibleNpc.x < 0 ||
        visibleNpc.x > z.width ||
        visibleNpc.y < 0 ||
        visibleNpc.y > z.height
      ) {
        errors.push(`zone ${z.id}: npc ${visibleNpc.npcId} outside bounds`);
      }
    }
    for (const interaction of z.interactions) {
      if (interaction.zone !== z.id)
        errors.push(`interaction ${interaction.id}: zone ${interaction.zone} ≠ ${z.id}`);
      if (interactionIds.has(interaction.id))
        errors.push(`duplicate interaction id ${interaction.id}`);
      interactionIds.add(interaction.id);
      checkCondition(interaction.condition, `interaction ${interaction.id}`);
      checkEffect(
        { kind: "notes", ids: interaction.note ? [interaction.note] : [] },
        `interaction ${interaction.id}`,
      );
      for (const effect of interaction.effects ?? [])
        checkEffect(effect, `interaction ${interaction.id}`);
      if (interaction.kind === "exit") {
        if (!interaction.exit) errors.push(`interaction ${interaction.id}: exit without target`);
        else {
          checkZone(interaction.exit.to, `interaction ${interaction.id}`);
          const target = ZONES[interaction.exit.to];
          if (target && !target.spawns[interaction.exit.via]) {
            errors.push(
              `interaction ${interaction.id}: spawn "${interaction.exit.via}" missing in ${interaction.exit.to}`,
            );
          }
        }
      }
      if (interaction.dialogue && !dialogueIds.has(interaction.dialogue)) {
        errors.push(`interaction ${interaction.id}: dialogue "${interaction.dialogue}" missing`);
      }
      if (
        interaction.x < 0 ||
        interaction.x > z.width ||
        interaction.y < 0 ||
        interaction.y > z.height
      ) {
        errors.push(`interaction ${interaction.id}: outside zone bounds`);
      }
    }
    if (!z.spawns[z.defaultSpawn])
      errors.push(`zone ${z.id}: default spawn "${z.defaultSpawn}" missing`);
    for (const [key, spawn] of Object.entries(z.spawns)) {
      if (spawn.x < 0 || spawn.x > z.width || spawn.y < 0 || spawn.y > z.height) {
        errors.push(`zone ${z.id}: spawn "${key}" outside bounds`);
      }
    }
  }

  /* Entrance symmetry: every exit must be reachable and have a return exit. */
  for (const z of zone) {
    for (const interaction of z.interactions) {
      if (interaction.kind !== "exit" || !interaction.exit) continue;
      const target = ZONES[interaction.exit.to];
      if (!target) continue;
      const hasReturn = target.interactions.some((candidate) => candidate.exit?.to === z.id);
      if (!hasReturn)
        errors.push(`exit ${interaction.id}: no return exit from ${target.id} to ${z.id}`);
    }
  }

  /* Quest chain must be connected. */
  const reachable = new Set<string>();
  const queue = ["q_arrival"];
  while (queue.length) {
    const id = queue.shift()!;
    if (!questIds.has(id) || reachable.has(id)) continue;
    reachable.add(id);
    for (const quest of QUESTS) {
      if (quest.id === id) continue;
      const condition = quest.autoStartWhen;
      if (!condition) continue;
      const dependsOn = JSON.stringify(condition);
      if (dependsOn.includes(`"questDone":"${id}"`)) queue.push(quest.id);
      if (condition.questDone === id) queue.push(quest.id);
      if (condition.all) {
        for (const item of condition.all) {
          if (item.questDone === id) queue.push(quest.id);
        }
      }
    }
  }
  for (const id of ["q_arrival", "q_metro", "q_shop", "q_cafe"]) {
    if (!reachable.has(id)) errors.push(`quest ${id} is not reachable from q_arrival`);
  }

  return errors;
}

export function assertContentValid(): void {
  const errors = validateContent();
  if (errors.length) {
    throw new Error(
      `MIR content validation failed:\n${errors.map((error) => ` · ${error}`).join("\n")}`,
    );
  }
}

export function findDialogue(id: string): DialogueDefinition | undefined {
  return DIALOGUES_BY_ID[id];
}

export function findQuest(id: string): QuestDefinition | undefined {
  return QUESTS_BY_ID[id];
}
