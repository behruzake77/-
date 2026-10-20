import Phaser from "phaser";
import type { NpcDefinition } from "@mir/shared";

const INK = 0x1a1512;

function shade(input: string | number, amount: number): number {
  const value =
    typeof input === "number" ? input : Phaser.Display.Color.HexStringToColor(input).color;
  const r = Math.max(0, Math.min(255, ((value >> 16) & 255) + amount));
  const g = Math.max(0, Math.min(255, ((value >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (value & 255) + amount));
  return (r << 16) | (g << 8) | b;
}

const SKIN_LEG = 0xbf9478;

/** Realistic adult proportions — 1:7.5 head-to-body, narrow silhouette, photographic shading. */
export function createFigure(
  scene: Phaser.Scene,
  def: NpcDefinition,
  role: "npc" | "player" = "npc",
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);
  const g = scene.add.graphics();
  const look =
    role === "player"
      ? {
          skin: "#d7ad8f",
          hair: "#2e2018",
          coat: "#4a5a44",
          coatAlt: "#333a2e",
          accent: "#b78a3e",
          accessory: "bag" as const,
          hairStyle: "short" as const,
        }
      : def.look;

  if (def.id === "musya" && role === "npc") {
    drawCat(scene, g);
    container.add(g);
    container.setSize(28, 26);
    return container;
  }

  const skin = Phaser.Display.Color.HexStringToColor(look.skin).color;
  const coat = Phaser.Display.Color.HexStringToColor(look.coat).color;
  const coatAlt = Phaser.Display.Color.HexStringToColor(look.coatAlt).color;
  const hair = Phaser.Display.Color.HexStringToColor(look.hair).color;
  const accent = Phaser.Display.Color.HexStringToColor(look.accent ?? "#c9a26a").color;

  // soft ambient shadow — larger, more diffuse, photo-real
  g.fillStyle(0x000000, 0.22);
  g.fillEllipse(0, 2, 30, 10);
  g.fillStyle(0x000000, 0.11);
  g.fillEllipse(0, 2, 42, 14);

  // legs — longer, slimmer, straight cut trousers
  g.fillStyle(shade(coatAlt, -22), 1);
  g.fillRoundedRect(-7.5, -10, 6, 26, 2.5);
  g.fillRoundedRect(1.8, -10, 6, 26, 2.5);
  // trouser crease
  g.fillStyle(shade(coatAlt, 10), 0.35);
  g.fillRect(-5.2, -8, 1, 22);
  g.fillRect(3.9, -8, 1, 22);
  // shoes — lower profile, matte
  g.fillStyle(0x1f1a16, 1);
  g.fillRoundedRect(-9.5, 13, 9.5, 4.5, 1.8);
  g.fillRoundedRect(1.2, 13, 9.5, 4.5, 1.8);
  g.fillStyle(0x2a231d, 1);
  g.fillRoundedRect(-9.5, 13, 9.5, 1.6, 1);
  g.fillRoundedRect(1.2, 13, 9.5, 1.6, 1);

  // coat / torso — narrower, longer, cinematic tailoring
  g.fillStyle(coat, 1);
  g.fillRoundedRect(-11, -44, 22, 36, 6);
  // centre seam
  g.lineStyle(1, shade(coat, -18), 0.5);
  g.lineBetween(0, -44, 0, -8);
  // left lapel highlight
  g.fillStyle(shade(coat, 18), 1);
  g.fillRoundedRect(-11, -44, 5.5, 24, 2.5);
  // waist suppression
  g.fillStyle(shade(coatAlt, -6), 0.45);
  g.fillRect(-11, -18, 22, 6);
  // hem line
  g.fillStyle(shade(coat, -28), 0.55);
  g.fillRect(-11, -9, 22, 1.6);
  // shoulder seam
  g.lineStyle(1, shade(coatAlt, -14), 0.4);
  g.lineBetween(-11, -38, -5, -36);
  g.lineBetween(11, -38, 5, -36);

  // arms — slimmer, slightly away from body
  g.fillStyle(coat, 1);
  g.fillRoundedRect(-15.5, -40, 5, 24, 2.4);
  g.fillRoundedRect(10.8, -40, 5, 24, 2.4);
  // cuff
  g.fillStyle(shade(coatAlt, -10), 1);
  g.fillRect(-15.8, -18, 5.6, 3);
  g.fillRect(10.5, -18, 5.6, 3);
  g.fillStyle(skin, 1);
  g.fillCircle(-13, -15.5, 2.6);
  g.fillCircle(13, -15.5, 2.6);

  // neck — thinner, shadowed
  g.fillStyle(shade(look.skin, -42), 1);
  g.fillRect(-3, -50, 6, 8);
  g.fillStyle(SKIN_LEG, 1);
  g.fillRect(-3, -50, 6, 6);
  g.fillStyle(skin, 1);
  g.fillCircle(0, -58.5, 9);
  // jaw shadow
  g.fillStyle(shade(look.skin, -20), 1);
  g.fillEllipse(0, -53.5, 10, 3.5);
  // cheek plane
  g.fillStyle(shade(look.skin, 14), 0.28);
  g.fillCircle(-3.2, -59, 3.8);

  // hair — tighter, more skull-conforming
  if (look.hairStyle === "beanie" || look.hairStyle === "cap") {
    g.fillStyle(look.hairStyle === "beanie" ? accent : hair, 1);
    g.fillRoundedRect(-10, -69.5, 20, 11.5, 5);
    if (look.hairStyle === "cap") {
      g.fillStyle(shade(look.hair, -16), 1);
      g.fillEllipse(2, -57.5, 18, 4.5);
      // cap stitching
      g.fillStyle(shade(look.hair, 18), 0.3);
      g.fillRect(-6, -68, 12, 1);
    } else {
      g.fillStyle(shade(accent, -32), 1);
      g.fillRect(-10, -59.5, 20, 3.5);
      g.fillStyle(shade(accent, 14), 0.25);
      g.fillRect(-10, -68, 20, 1);
    }
  } else {
    g.fillStyle(hair, 1);
    g.fillEllipse(0, -65.5, 19, 11);
    g.fillRect(-9.5, -66.5, 19, 5);
    if (look.hairStyle === "bun") {
      g.fillCircle(0, -73.5, 4.8);
      g.fillStyle(shade(hair, 18), 0.22);
      g.fillCircle(-1, -74.5, 2);
    }
    if (look.hairStyle === "bob" || look.hairStyle === "long") {
      g.fillRoundedRect(-10, -64, 4.5, 13, 1.8);
      g.fillRoundedRect(5.8, -64, 4.5, 13, 1.8);
      g.fillStyle(shade(hair, 12), 0.2);
      g.fillRoundedRect(-10, -64, 4.5, 13, 1.8);
    }
    if (look.hairStyle === "short") {
      g.fillStyle(shade(hair, 10), 0.18);
      g.fillEllipse(1.2, -66, 7, 3);
    }
  }

  // eyes — smaller, more inset, with catchlight
  g.fillStyle(0x1c1814, 1);
  g.fillCircle(-3.2, -58.5, 1.15);
  g.fillCircle(3.2, -58.5, 1.15);
  g.fillStyle(0xf2e9d9, 0.95);
  g.fillCircle(-2.8, -59.2, 0.45);
  g.fillCircle(3.6, -59.2, 0.45);

  // accessory — shifted to new head/body anchors
  if (look.accessory === "scarf") {
    g.fillStyle(accent, 1);
    g.fillRoundedRect(-6.5, -48.5, 13, 4.5, 1.8);
    g.fillRoundedRect(0.5, -44.5, 3.5, 9, 1.6);
  } else if (look.accessory === "glasses") {
    g.lineStyle(1.1, INK, 0.92);
    g.strokeCircle(-3.2, -58.5, 3.1);
    g.strokeCircle(3.2, -58.5, 3.1);
    g.lineBetween(-0.1, -58.5, 0.1, -58.5);
  } else if (look.accessory === "apron" || look.accessory === "vest") {
    g.fillStyle(look.accessory === "vest" ? accent : shade(look.coatAlt, 26), 1);
    g.fillRoundedRect(-8.5, -32, 17, 15, 2.6);
    if (look.accessory === "vest") {
      g.lineStyle(1, shade(accent, -30), 0.35);
      g.lineBetween(0, -32, 0, -17);
    }
  } else if (look.accessory === "uniform") {
    g.fillStyle(accent, 1);
    g.fillRect(-3.5, -41, 7, 2.4);
    g.fillStyle(shade(accent, -22), 0.9);
    g.fillRect(-3.5, -38.6, 7, 0.9);
  } else if (look.accessory === "earbuds") {
    g.fillStyle(0xf2ead9, 1);
    g.fillCircle(-9.2, -58.2, 1.9);
    g.lineStyle(1, 0xf2ead9, 0.88);
    g.lineBetween(-9.2, -56.5, -7.2, -42);
    g.fillStyle(0xf2ead9, 0.7);
    g.fillCircle(-7.2, -42, 0.9);
  }

  if (role === "player") {
    // messenger bag — more photographic, less icon
    g.fillStyle(0x3b332a, 1);
    g.fillRoundedRect(-10.5, -30, 14, 13, 3.2);
    g.fillStyle(0x4a3f2c, 1);
    g.fillRoundedRect(-10.2, -29.7, 13.4, 12.4, 2.8);
    g.lineStyle(1.2, 0x8a6a3e, 0.75);
    g.strokeRoundedRect(-10.5, -30, 14, 13, 3.2);
    g.fillStyle(0x8a6a3e, 0.9);
    g.fillRect(-5, -27, 3, 1.4);
    g.lineStyle(1, 0x2a231d, 0.5);
    g.lineBetween(-10.5, -24, 3.5, -24);
  }

  container.add(g);
  container.setSize(28, 88);
  return container;
}

function drawCat(_scene: Phaser.Scene, g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x000000, 0.24);
  g.fillEllipse(0, 0, 26, 8);
  g.fillStyle(0x6f6c66, 1);
  g.fillEllipse(0, -9, 24, 13);
  g.fillStyle(0x8d8a84, 1);
  g.fillCircle(8, -17, 7.5);
  g.fillStyle(0x63605b, 1);
  g.fillTriangle(3, -22, 7, -30, 9, -21);
  g.fillTriangle(11, -22, 15, -29, 15, -20);
  g.fillStyle(0x8d8a84, 1);
  g.fillEllipse(-11, -8, 9, 5);
  g.lineStyle(2, 0x8d8a84, 1);
  g.beginPath();
  g.moveTo(-12, -6);
  g.lineTo(-20, -12);
  g.strokePath();
  g.fillStyle(0xd9d2c4, 1);
  g.fillCircle(9.5, -17, 0.9);
  g.fillCircle(7, -17, 0.9);
}
