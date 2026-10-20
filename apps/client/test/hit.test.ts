import { describe, expect, it } from "vitest";
import { isBodyHit, npcHitScore } from "../src/game/hit";

/**
 * Regression: tapping a character's head used to do nothing, because the hit
 * test circled the anchor point at their feet.
 */
describe("NPC touch targets", () => {
  const feet = { x: 884, y: 612 };

  it("accepts a tap on the head and torso", () => {
    expect(isBodyHit(884, 530, feet)).toBe(true); // head
    expect(isBodyHit(884, 575, feet)).toBe(true); // torso
    expect(isBodyHit(870, 600, feet)).toBe(true); // legs
  });

  it("accepts a tap just below the feet (shadows and benches)", () => {
    expect(isBodyHit(884, 630, feet)).toBe(true);
  });

  it("rejects taps on empty ground and neighbouring props", () => {
    expect(isBodyHit(884, 440, feet)).toBe(false); // well above the head
    expect(isBodyHit(760, 612, feet)).toBe(false); // a bench away
    expect(isBodyHit(884, 700, feet)).toBe(false); // floor below
  });

  it("scores the body centre highest, so overlapping figures resolve sensibly", () => {
    const head = npcHitScore(884, 530, feet) ?? Infinity;
    const centre = npcHitScore(884, 574, feet) ?? Infinity;
    expect(centre).toBeLessThan(head);
  });
});
