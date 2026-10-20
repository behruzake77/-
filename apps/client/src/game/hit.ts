/**
 * Figures are drawn with their origin at the feet, so the point a player taps
 * is usually the head or torso, not the anchor. This capsule is the touch
 * target used by the scene and kept here as a pure function so the geometry
 * can be tested without a canvas.
 */
export interface FigureBounds {
  /** Anchor x (the figure's feet). */
  x: number;
  /** Anchor y (the figure's feet). */
  y: number;
}

export const NPC_TOUCH = {
  halfWidth: 46,
  aboveFeet: 104,
  belowFeet: 30,
} as const;

export function npcHitScore(px: number, py: number, figure: FigureBounds): number | null {
  const dx = px - figure.x;
  const dy = py - figure.y;
  if (Math.abs(dx) > NPC_TOUCH.halfWidth) return null;
  if (dy < -NPC_TOUCH.aboveFeet || dy > NPC_TOUCH.belowFeet) return null;
  // Score from the middle of the body so the closest figure wins ties.
  return Math.hypot(dx, dy + 38);
}

export function isBodyHit(px: number, py: number, figure: FigureBounds): boolean {
  return npcHitScore(px, py, figure) !== null;
}
