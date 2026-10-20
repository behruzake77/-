import { QUESTS_BY_ID } from "../content/quests.js";
import type { GameState } from "../types.js";

/**
 * Interaction ids the world should point at right now.
 *
 * The quest content owns this knowledge (`step.marker`), so the scene never
 * invents its own idea of what the player is supposed to do next.
 */
export function activeObjectiveMarkers(state: GameState): string[] {
  const markers: string[] = [];
  for (const questState of Object.values(state.quests)) {
    if (questState.status !== "active") continue;
    const quest = QUESTS_BY_ID[questState.id];
    const step = quest?.steps[questState.step];
    if (step?.marker && !markers.includes(step.marker)) markers.push(step.marker);
  }
  return markers;
}
