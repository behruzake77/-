import type { Condition, GameState } from "../types.js";

/** Evaluate an authored condition against the live game state. */
export function evaluateCondition(condition: Condition | undefined, state: GameState): boolean {
  if (!condition) return true;
  if (condition.flag) {
    const value = state.flags[condition.flag];
    if (!value) return false;
    if (condition.flagIs !== undefined && value !== condition.flagIs) return false;
  }
  if (condition.notFlag && state.flags[condition.notFlag]) return false;
  if (condition.item && (state.inventory[condition.item] ?? 0) <= 0) return false;
  if (condition.zone && state.player.zone !== condition.zone) return false;
  if (condition.visited && !state.stats.zonesVisited.includes(condition.visited)) return false;
  if (condition.knowledge && state.knowledge[condition.knowledge] === undefined) return false;
  if (condition.questActive) {
    const quest = state.quests[condition.questActive];
    if (quest?.status !== "active") return false;
  }
  if (condition.questDone) {
    const quest = state.quests[condition.questDone];
    if (quest?.status !== "completed") return false;
  }
  if (condition.questStep) {
    const quest = state.quests[condition.questStep.quest];
    if (!quest) return false;
    if (quest.status !== "completed" && quest.step < condition.questStep.atLeast) return false;
  }
  if (condition.relationship) {
    const npc = state.npcs[condition.relationship.npc];
    if (!npc || npc.relationship < condition.relationship.atLeast) return false;
  }
  if (condition.talked && !(state.npcs[condition.talked.npc]?.talkCount ?? 0)) return false;
  if (condition.all && !condition.all.every((c) => evaluateCondition(c, state))) return false;
  if (condition.any && !condition.any.some((c) => evaluateCondition(c, state))) return false;
  if (condition.not && evaluateCondition(condition.not, state)) return false;
  return true;
}

export function describeConditionForDebug(condition: Condition): string {
  return JSON.stringify(condition);
}
