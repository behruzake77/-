import type {
  ActionResult,
  DialogueFeedback,
  DialogueNode,
  DialogueOption,
  Effect,
  EngineEvent,
  GameAction,
  GameState,
  LanguageNote,
  NpcId,
  NpcMemoryKind,
  NpcState,
  OpenDialogue,
  QuestDefinition,
  QuestState,
  Support,
  ZoneId,
} from "../types.js";
import { NO_SUPPORT } from "../types.js";
import { evaluateCondition } from "./conditions.js";
import { matchAnswer } from "./matcher.js";
import { planEvidence, trimEvidence } from "./learning.js";
import {
  DIALOGUES_BY_ID,
  ITEMS_BY_ID,
  NOTES_BY_ID,
  NPCS,
  QUESTS,
  ZONES,
  findInteraction,
  findNpcPlacement,
  resolveNpcDialogue,
  STARTING_MONEY,
} from "../content/index.js";

const DEFAULT_NAME = "Алекс";
const START_MINUTES = 16 * 60 + 40;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Game state is deliberately plain JSON, which also makes replayed saves portable. */
function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

function ensureNpc(state: GameState, npcId: NpcId): NpcState {
  const existing = state.npcs[npcId];
  if (existing) return existing;
  const def = NPCS.find((npc) => npc.id === npcId);
  const created: NpcState = {
    id: npcId,
    met: false,
    relationship: def?.kindnessStart ?? 0,
    talkCount: 0,
    memories: [],
  };
  state.npcs[npcId] = created;
  return created;
}

export function createInitialState(now = Date.now(), name = ""): GameState {
  const npcs: Record<string, NpcState> = {};
  for (const npc of NPCS) {
    npcs[npc.id] = {
      id: npc.id,
      met: false,
      relationship: npc.kindnessStart ?? 0,
      talkCount: 0,
      memories: [],
    };
  }
  return {
    schemaVersion: 1,
    saveId: `save_${now.toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`,
    createdAt: now,
    updatedAt: now,
    started: false,
    name,
    day: 1,
    minutes: START_MINUTES,
    player: {
      zone: "courtyard",
      x: 720,
      y: 890,
      facing: "up",
      money: 0,
    },
    inventory: {},
    quests: {},
    npcs,
    flags: {},
    knowledge: {},
    notes: [],
    journal: [],
    language: { evidence: [] },
    stats: { interactions: 0, dialogues: 0, zonesVisited: [] },
    seenIntro: false,
  };
}

function emitTime(state: GameState, events: EngineEvent[]) {
  events.push({ kind: "time", minutes: state.minutes, day: state.day });
}

function advanceTime(state: GameState, minutes: number, events: EngineEvent[]) {
  if (!Number.isFinite(minutes) || minutes === 0) return;
  const total = state.minutes + Math.round(minutes);
  if (total >= 1440) {
    const days = Math.floor(total / 1440);
    state.day += days;
    state.minutes = total % 1440;
  } else if (total < 0) {
    state.minutes = 0;
  } else {
    state.minutes = total;
  }
  emitTime(state, events);
}

function startQuest(state: GameState, quest: QuestDefinition, now: number, events: EngineEvent[]) {
  if (state.quests[quest.id]) return;
  const questState: QuestState = {
    id: quest.id,
    status: "active",
    step: 0,
    startedAt: now,
  };
  state.quests[quest.id] = questState;
  events.push({
    kind: "questStarted",
    questId: quest.id,
    titleRu: quest.titleRu,
    titleEn: quest.titleEn,
  });
}

function completeQuest(
  state: GameState,
  quest: QuestDefinition,
  now: number,
  events: EngineEvent[],
) {
  const questState = state.quests[quest.id];
  if (!questState || questState.status === "completed") return;
  questState.status = "completed";
  questState.step = quest.steps.length;
  questState.completedAt = now;
  events.push({
    kind: "questCompleted",
    questId: quest.id,
    titleRu: quest.titleRu,
    titleEn: quest.titleEn,
  });
  if (quest.completionEffects) {
    applyEffects(state, quest.completionEffects, now, events);
  }
}

/**
 * Applies authored effects transactionally. Effects only ever come from
 * content that ships with the game; the player cannot submit arbitrary effects.
 */
function applyEffects(
  state: GameState,
  effects: Effect[],
  now: number,
  events: EngineEvent[],
): boolean {
  const backup = cloneState(state);
  for (const effect of effects) {
    switch (effect.kind) {
      case "flag": {
        state.flags[effect.key] = effect.value ?? true;
        break;
      }
      case "knowledge": {
        if (state.knowledge[effect.key] === undefined) {
          state.knowledge[effect.key] = now;
          events.push({ kind: "knowledge", key: effect.key });
        }
        break;
      }
      case "relationship": {
        const npc = ensureNpc(state, effect.npc);
        npc.relationship = clamp(npc.relationship + effect.delta, 0, 100);
        if (effect.memory) {
          npc.memories.push({
            textRu: effect.memory,
            textEn: effect.memoryEn,
            kind: (effect.memoryKind ?? "fact") as NpcMemoryKind,
            at: now,
          });
          if (npc.memories.length > 14) npc.memories = npc.memories.slice(-14);
        }
        events.push({
          kind: "relationship",
          npcId: effect.npc,
          delta: effect.delta,
          value: npc.relationship,
          memory: effect.memory,
        });
        break;
      }
      case "item": {
        const qty = effect.qty ?? 1;
        const next = (state.inventory[effect.id] ?? 0) + qty;
        if (next <= 0) delete state.inventory[effect.id];
        else state.inventory[effect.id] = next;
        const item = ITEMS_BY_ID[effect.id];
        events.push({
          kind: "item",
          itemId: effect.id,
          qty,
          nameRu: item?.nameRu ?? effect.id,
        });
        break;
      }
      case "money": {
        const total = state.player.money + effect.delta;
        if (total < 0) {
          Object.assign(state, backup);
          events.push({
            kind: "error",
            code: "insufficient_funds",
            messageRu: "Не хватает денег.",
            messageEn: "Not enough money.",
          });
          return false;
        }
        state.player.money = total;
        events.push({ kind: "money", delta: effect.delta, total });
        break;
      }
      case "startQuest": {
        const quest = QUESTS.find((candidate) => candidate.id === effect.quest);
        if (quest) startQuest(state, quest, now, events);
        break;
      }
      case "completeQuest": {
        const quest = QUESTS.find((candidate) => candidate.id === effect.quest);
        if (quest) completeQuest(state, quest, now, events);
        break;
      }
      case "time": {
        advanceTime(state, effect.minutes, events);
        break;
      }
      case "event": {
        events.push({ kind: "custom", event: effect.event });
        break;
      }
      case "unlock": {
        state.knowledge[`zone.${effect.zone}`] = now;
        events.push({
          kind: "unlocked",
          zone: effect.zone,
          nameRu: ZONES[effect.zone]?.nameRu ?? effect.zone,
        });
        break;
      }
      case "purchase": {
        let total = 0;
        for (const purchase of effect.items) {
          const item = ITEMS_BY_ID[purchase.id];
          if (!item) continue;
          total += item.price * (purchase.qty ?? 1);
        }
        if (total > state.player.money) {
          Object.assign(state, backup);
          events.push({
            kind: "error",
            code: "insufficient_funds",
            messageRu: `Не хватает денег. Нужно ${total} ₽, у тебя ${state.player.money} ₽.`,
            messageEn: `Not enough money. You need ${total} ₽ and have ${state.player.money} ₽.`,
          });
          return false;
        }
        state.player.money -= total;
        for (const purchase of effect.items) {
          const item = ITEMS_BY_ID[purchase.id];
          const qty = purchase.qty ?? 1;
          state.inventory[purchase.id] = (state.inventory[purchase.id] ?? 0) + qty;
          state.flags[`bought.${purchase.id}`] = true;
          events.push({
            kind: "item",
            itemId: purchase.id,
            qty,
            nameRu: item?.nameRu ?? purchase.id,
          });
        }
        events.push({ kind: "money", delta: -total, total: state.player.money });
        break;
      }
      case "notes": {
        for (const id of effect.ids) {
          const note = NOTES_BY_ID[id];
          if (!note) continue;
          if (!state.notes.includes(id)) {
            state.notes.push(id);
            state.journal.push({
              id: note.id,
              titleRu: note.titleRu,
              titleEn: note.titleEn,
              textRu: note.textRu,
              textEn: note.textEn,
              at: now,
              day: state.day,
            });
            if (state.journal.length > 40) state.journal = state.journal.slice(-40);
            events.push({ kind: "note", noteId: id, titleRu: note.titleRu, titleEn: note.titleEn });
          }
        }
        break;
      }
      default: {
        break;
      }
    }
  }
  return true;
}

function advanceQuests(state: GameState, now: number, events: EngineEvent[]) {
  let guard = 0;
  let changed = true;
  while (changed && guard++ < 30) {
    changed = false;
    for (const quest of QUESTS) {
      if (
        !state.quests[quest.id] &&
        quest.autoStartWhen &&
        evaluateCondition(quest.autoStartWhen, state)
      ) {
        startQuest(state, quest, now, events);
        changed = true;
      }
    }
    for (const quest of QUESTS) {
      const questState = state.quests[quest.id];
      if (questState?.status !== "active") continue;
      let inner = 0;
      while (questState.status === "active" && inner++ < 20) {
        const step = quest.steps[questState.step];
        if (!step) {
          completeQuest(state, quest, now, events);
          changed = true;
          break;
        }
        if (!evaluateCondition(step.done, state)) break;
        questState.step += 1;
        changed = true;
        if (questState.step >= quest.steps.length) {
          completeQuest(state, quest, now, events);
          break;
        }
        const nextStep = quest.steps[questState.step];
        events.push({
          kind: "questStep",
          questId: quest.id,
          stepIndex: questState.step,
          ru: nextStep.ru,
          en: nextStep.en,
        });
      }
    }
  }
}

function recordEvidence(
  state: GameState,
  node: DialogueNode,
  option: DialogueOption,
  feedback: DialogueFeedback,
  support: Support,
  now: number,
  events: EngineEvent[],
) {
  const vocab = [...new Set([...(node.vocab ?? []), ...(option.vocab ?? [])])].slice(0, 6);
  if (!vocab.length) return;
  const correct = option.correct !== false;
  const plan = planEvidence({
    vocab,
    mode: node.mode === "typed" ? "typed" : "choice",
    correct,
    support,
    retention: Boolean(node.retention || option.retention),
    successScore: correct ? 1 : 0.15,
  });
  let added = 0;
  const skills = node.skill ? [node.skill] : plan.skills;
  for (const vocabId of plan.vocab) {
    for (const skill of skills) {
      state.language.evidence.push({
        id: `${now.toString(36)}-${state.language.evidence.length}-${vocabId}-${skill}`,
        vocab: vocabId,
        skill,
        outcome: plan.outcome,
        at: now,
        source: `${feedback.optionId ?? option.id}:${node.id}`,
        support: { ...support },
        note: feedback.corrections[0]?.en,
      });
      added++;
    }
  }
  state.language.evidence = trimEvidence(state.language.evidence);
  if (added) events.push({ kind: "evidence", count: added, vocab: plan.vocab });
}

function openNpcDialogue(
  state: GameState,
  npcId: NpcId,
  now: number,
  events: EngineEvent[],
): OpenDialogue | undefined {
  const placement = findNpcPlacement(state.player.zone, npcId, state);
  if (!placement) {
    events.push({
      kind: "error",
      code: "npc_not_here",
      messageRu: "Здесь никого нет.",
      messageEn: "There is no one here.",
    });
    return undefined;
  }
  const dialogueId = resolveNpcDialogue(state, npcId);
  const dialogue = dialogueId ? DIALOGUES_BY_ID[dialogueId] : undefined;
  if (!dialogue) {
    events.push({
      kind: "error",
      code: "dialogue_missing",
      messageRu: "Нечего сказать. (Диалог не найден.)",
      messageEn: "Nothing to say. (Dialogue missing.)",
    });
    return undefined;
  }
  const npc = ensureNpc(state, npcId);
  if (!npc.met) events.push({ kind: "custom", event: `npc.met:${npcId}` });
  npc.met = true;
  npc.talkCount += 1;
  npc.lastTalkedAt = now;
  state.stats.dialogues += 1;
  return { dialogueId: dialogue.id, nodeId: dialogue.entry, npcId };
}

function applyPlayerPosition(
  state: GameState,
  x: number,
  y: number,
  facing?: GameState["player"]["facing"],
) {
  const zone = ZONES[state.player.zone];
  if (!zone) return;
  state.player.x = clamp(Number.isFinite(x) ? x : state.player.x, 8, zone.width - 8);
  state.player.y = clamp(Number.isFinite(y) ? y : state.player.y, 8, zone.height - 8);
  if (facing) state.player.facing = facing;
}

export function applyAction(prev: GameState, action: GameAction, now = Date.now()): ActionResult {
  const state = cloneState(prev);
  const events: EngineEvent[] = [];
  let dialogue: OpenDialogue | undefined;
  let feedback: DialogueFeedback | undefined;
  let transition: ActionResult["transition"];

  switch (action.type) {
    case "BEGIN": {
      if (state.started) break;
      state.started = true;
      state.name = (action.name ?? "").trim().slice(0, 24) || state.name || DEFAULT_NAME;
      state.player.money = STARTING_MONEY;
      state.inventory.key = 1;
      state.inventory.phone = 1;
      const arrival = QUESTS.find((quest) => quest.id === "q_arrival");
      if (arrival) startQuest(state, arrival, now, events);
      events.push({
        kind: "notice",
        titleRu: "Северогорск",
        titleEn: "Severogorsk",
        messageRu:
          "Ты приехал(а). Двор пахнет дождём и чужим чаем. Ключ в кармане, телефон разряжен.",
        messageEn:
          "You have arrived. The courtyard smells of rain and someone else’s tea. The key is in your pocket, your phone is dead.",
        tone: "info",
      });
      break;
    }
    case "ENTER_ZONE": {
      const zone = ZONES[action.zone];
      if (!zone) {
        events.push({
          kind: "error",
          code: "unknown_zone",
          messageRu: "Туда нельзя пройти.",
          messageEn: "You cannot go there.",
        });
        break;
      }
      const spawnKey = action.via && zone.spawns[action.via] ? action.via : zone.defaultSpawn;
      const spawn = zone.spawns[spawnKey] ?? { x: zone.width / 2, y: zone.height / 2 };
      state.player.zone = action.zone;
      state.player.x = spawn.x;
      state.player.y = spawn.y;
      if (!state.stats.zonesVisited.includes(action.zone))
        state.stats.zonesVisited.push(action.zone);
      state.flags[`visited.${action.zone}`] = true;
      advanceTime(state, 2, events);
      break;
    }
    case "POSITION": {
      applyPlayerPosition(state, action.x, action.y, action.facing);
      break;
    }
    case "TICK": {
      const minutes = Math.round(Number(action.minutes));
      if (Number.isFinite(minutes) && minutes > 0)
        advanceTime(state, Math.min(60, minutes), events);
      break;
    }
    case "INTERACT": {
      const zone = ZONES[state.player.zone];
      if (!zone) break;
      if (action.targetId.startsWith("npc:")) {
        const npcId = action.targetId.slice(4) as NpcId;
        const opened = openNpcDialogue(state, npcId, now, events);
        if (opened) dialogue = opened;
        break;
      }
      const interaction = findInteraction(zone.id, action.targetId);
      if (!interaction) {
        events.push({
          kind: "error",
          code: "nothing_here",
          messageRu: "Здесь ничего нет.",
          messageEn: "There is nothing here.",
        });
        break;
      }
      if (!evaluateCondition(interaction.condition, state)) {
        events.push({
          kind: "error",
          code: "not_visible",
          messageRu: "Сейчас этого не видно.",
          messageEn: "You can’t see that right now.",
        });
        break;
      }
      state.stats.interactions += 1;
      if (interaction.kind === "exit" && interaction.exit) {
        transition = { to: interaction.exit.to, via: interaction.exit.via };
        break;
      }
      if (interaction.effects) {
        const ok = applyEffects(state, interaction.effects, now, events);
        if (!ok) break;
      }
      if (interaction.note && !state.notes.includes(interaction.note)) {
        applyEffects(state, [{ kind: "notes", ids: [interaction.note] }], now, events);
      }
      if (interaction.textRu) {
        events.push({
          kind: "notice",
          titleRu: interaction.titleRu ?? interaction.labelRu,
          titleEn: interaction.titleEn ?? interaction.labelEn,
          messageRu: interaction.textRu,
          messageEn: interaction.textEn ?? "",
          tone: "info",
        });
      }
      if (interaction.dialogue) {
        const scene = DIALOGUES_BY_ID[interaction.dialogue];
        if (scene) {
          dialogue = { dialogueId: scene.id, nodeId: scene.entry, npcId: scene.npc };
          state.stats.dialogues += 1;
        }
      }
      break;
    }
    case "CHOOSE": {
      const scene = DIALOGUES_BY_ID[action.dialogueId];
      const node = scene?.nodes[action.nodeId];
      {
        if (!scene || !node) {
          events.push({
            kind: "error",
            code: "bad_dialogue",
            messageRu: "Диалог потерялся.",
            messageEn: "The dialogue is missing.",
          });
          break;
        }
        const option = node.options?.find((candidate) => candidate.id === action.optionId);
        if (!option) {
          events.push({
            kind: "error",
            code: "bad_option",
            messageRu: "Такого ответа нет.",
            messageEn: "That answer does not exist.",
          });
          break;
        }
        const support: Support = {
          ...NO_SUPPORT,
          ...(action.support ?? {}),
          typed: node.mode === "typed",
        };
        const notes: LanguageNote[] = [];
        if (option.note) notes.push(option.note);
        if (option.correct === false) {
          notes.push({
            ru: "Ничего страшного. Послушай ещё раз — и попробуй снова.",
            en: "Never mind. Listen again — and try once more.",
          });
        }
        feedback = {
          accepted: true,
          status: "accepted",
          optionId: option.id,
          intent: option.intent,
          next: option.next,
          end: !option.next || option.end === true,
          corrections: notes,
          matchedRu: option.ru,
          score: 1,
        };
        recordEvidence(state, node, option, feedback, support, now, events);
        if (option.effects && !applyEffects(state, option.effects, now, events)) {
          feedback.accepted = false;
          feedback.status = "close";
          feedback.next = undefined;
          feedback.end = false;
        }
        break;
      }
    }
    case "TYPE": {
      const scene = DIALOGUES_BY_ID[action.dialogueId];
      const node = scene?.nodes[action.nodeId];
      if (!scene || !node?.typed || !node.options?.length) {
        events.push({
          kind: "error",
          code: "bad_typed_node",
          messageRu: "Здесь нечего писать.",
          messageEn: "There is nothing to type here.",
        });
        break;
      }
      const support: Support = { ...NO_SUPPORT, ...(action.support ?? {}), typed: true };
      const match = matchAnswer(action.text, node.options);
      if (match.status !== "accepted" || !match.option) {
        feedback = {
          accepted: false,
          status: match.status,
          corrections: match.corrections,
          messageRu: node.typed.unclearRu,
          messageEn: node.typed.unclearEn,
          score: match.score,
          matchedRu: match.interpreted,
        };
        events.push({
          kind: "notice",
          messageRu: node.typed.unclearRu,
          messageEn: node.typed.unclearEn,
          tone: "gentle",
        });
        break;
      }
      const option = node.options.find((candidate) => candidate.id === match.option?.id);
      if (!option) break;
      const corrections = [...match.corrections];
      if (option.note) corrections.push(option.note);
      feedback = {
        accepted: true,
        status: "accepted",
        optionId: option.id,
        intent: option.intent,
        next: option.next,
        end: !option.next || option.end === true,
        corrections,
        matchedRu: option.ru,
        score: match.score,
      };
      recordEvidence(state, node, option, feedback, support, now, events);
      if (option.effects && !applyEffects(state, option.effects, now, events)) {
        feedback.accepted = false;
        feedback.status = "close";
        feedback.next = undefined;
        feedback.end = false;
      }
      break;
    }
    case "BUY": {
      if (state.player.zone !== "shop") {
        events.push({
          kind: "error",
          code: "not_in_shop",
          messageRu: "Здесь не продают продукты.",
          messageEn: "They don’t sell groceries here.",
        });
        break;
      }
      const item = ITEMS_BY_ID[action.itemId];
      if (!item?.shop) {
        events.push({
          kind: "error",
          code: "not_for_sale",
          messageRu: "Этого нет в продаже.",
          messageEn: "That is not for sale.",
        });
        break;
      }
      applyEffects(
        state,
        [{ kind: "purchase", items: [{ id: item.id, qty: action.qty ?? 1 }] }],
        now,
        events,
      );
      break;
    }
    case "SLEEP": {
      if (state.player.zone !== "apartment") {
        events.push({
          kind: "error",
          code: "not_at_home",
          messageRu: "Спать лучше дома.",
          messageEn: "It’s better to sleep at home.",
        });
        break;
      }
      state.day += 1;
      state.minutes = 8 * 60 + 30;
      state.flags["slept.once"] = true;
      state.flags[`slept.day.${state.day}`] = true;
      if (state.flags["job.offered"]) state.flags["job.morning"] = true;
      events.push({ kind: "time", minutes: state.minutes, day: state.day });
      events.push({
        kind: "notice",
        titleRu: "Утро",
        titleEn: "Morning",
        messageRu:
          "Ты просыпаешься от дождя по стеклу. Восемь тридцать. Пахнет чаем из соседней квартиры.",
        messageEn:
          "You wake to rain on the glass. Eight thirty. It smells of tea from the next flat.",
        tone: "info",
      });
      break;
    }
    case "REVIEW": {
      if (!state.started) break;
      const seen = state.language.evidence.some((entry) => entry.vocab === action.vocab);
      if (!seen) {
        events.push({
          kind: "notice",
          messageRu: "Это слово ещё не встречалось в городе.",
          messageEn: "That word has not appeared in the city yet.",
          tone: "gentle",
        });
        break;
      }
      const support: Support = { ...NO_SUPPORT, ...(action.support ?? {}), typed: true };
      const outcome = action.correct ? 1 : 0.2;
      state.language.evidence.push({
        id: `${now.toString(36)}-${state.language.evidence.length}-${action.vocab}-${action.skill}`,
        vocab: action.vocab,
        skill: action.skill,
        outcome,
        at: now,
        source: "review",
        support,
        note: action.correct ? undefined : "review_miss",
      });
      state.language.evidence = trimEvidence(state.language.evidence);
      events.push({ kind: "evidence", count: 1, vocab: [action.vocab] });
      break;
    }
    case "CLOSE_DIALOGUE": {
      break;
    }
    default: {
      break;
    }
  }

  if (action.type !== "POSITION") {
    advanceQuests(state, now, events);
  }
  state.updatedAt = now;
  state.language.evidence = trimEvidence(state.language.evidence);
  return { state, events, dialogue, feedback, transition };
}

/** Utility used by the client to validate a save loaded from storage or the server. */
export function isKnownZone(value: string): value is ZoneId {
  return Boolean(ZONES[value]);
}
