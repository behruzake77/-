import Phaser from "phaser";
import type { PropDef, ZoneDefinition } from "@mir/shared";

const INK = 0x211b16;
const WOOD = 0x7b5a3e;
const WOOD_DARK = 0x573d29;
const WOOD_LIGHT = 0x9c7750;
const METAL = 0x50565a;
const METAL_DARK = 0x363c40;
const PAPER = 0xe8dcc4;
const MOSS = 0x63704f;
const MOSS_DARK = 0x4a563c;

const GROUND = new Set([
  "path",
  "rug",
  "mat",
  "puddle",
  "crosswalk",
  "road",
  "flowerbed",
  "sandbox",
]);

function hex(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  try {
    return Phaser.Display.Color.HexStringToColor(value).color;
  } catch {
    return fallback;
  }
}

function shade(color: number, amount: number): number {
  const r = Math.max(0, Math.min(255, ((color >> 16) & 255) + amount));
  const g = Math.max(0, Math.min(255, ((color >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (color & 255) + amount));
  return (r << 16) | (g << 8) | b;
}

export function isGroundProp(type: string): boolean {
  return GROUND.has(type);
}

export function paintProp(
  scene: Phaser.Scene,
  prop: PropDef,
  zone: ZoneDefinition,
): Phaser.GameObjects.GameObject | null {
  const defaultW: Record<string, number> = {
    wall: 200,
    door: 84,
    sign: 160,
    lamp: 30,
    bench: 112,
    plant: 34,
    tree: 150,
    bush: 64,
    table: 70,
    chair: 34,
    bed: 150,
    fridge: 60,
    counter: 180,
    bookshelf: 140,
    wardrobe: 80,
    register: 60,
    poster: 60,
    clock: 40,
    mirror: 46,
    picture: 70,
    kettle: 26,
    mug: 16,
    candle: 14,
    paper: 22,
    suitcase: 54,
    tv: 70,
    radiator: 80,
    kitchenette: 160,
    cabinet: 70,
    bar: 190,
    car: 190,
    bike: 66,
    bins: 74,
    kiosk: 150,
    turnstile: 60,
    pillar: 46,
    arch: 170,
  };
  const w = prop.w ?? defaultW[prop.type] ?? 60;
  const h = prop.h ?? defaultW[prop.type] ?? 60;
  const container = scene.add.container(prop.x, prop.y);
  const g = scene.add.graphics();
  const color = hex(prop.color, WOOD);
  const variant = prop.variant === undefined ? "" : String(prop.variant);

  const label = (text: string, cx: number, cy: number, size = 13, tint = "#2a231d") => {
    const node = scene.add.text(cx, cy, text, {
      fontFamily: '"Cormorant Garamond", serif',
      fontSize: `${size}px`,
      color: tint,
      align: "center",
    });
    node.setOrigin(0.5);
    return node;
  };

  switch (prop.type) {
    case "facade": {
      const wall = color;
      g.fillStyle(wall, 1);
      g.fillRect(0, 0, w, h);
      g.fillStyle(shade(wall, -22), 1);
      g.fillRect(0, 0, w, 12);
      g.fillRect(0, h - 14, w, 14);
      g.fillStyle(shade(wall, 16), 1);
      g.fillRect(0, 12, w, 5);
      // brick courses
      g.lineStyle(1, shade(wall, -14), 0.55);
      for (let y = 22; y < h; y += 18) {
        g.lineBetween(0, y, w, y);
        const offset = Math.floor(y / 18) % 2 === 0 ? 0 : 26;
        for (let x = offset; x < w; x += 52) {
          g.lineBetween(x, y, x, Math.min(h, y + 18));
        }
      }
      // windows
      const cols = Math.max(2, Math.floor(w / 250));
      const lit = [1, 3, 4];
      for (let i = 0; i < cols; i += 1) {
        const wx = 70 + i * ((w - 140) / Math.max(1, cols - 1 || 1));
        const windowW = 72;
        const windowH = 88;
        g.fillStyle(shade(wall, -34), 1);
        g.fillRoundedRect(wx - 5, 58, windowW + 10, windowH + 10, 4);
        g.fillStyle(lit.includes(i) ? 0xc69a5e : 0x3c4750, 1);
        g.fillRoundedRect(wx, 63, windowW, windowH, 3);
        g.fillStyle(shade(wall, -18), 1);
        g.fillRect(wx, 104, windowW, 4);
        g.fillRect(wx + windowW / 2 - 2, 63, 4, windowH);
        g.fillStyle(0x1c2429, 0.5);
        g.fillTriangle(wx, 63, wx + windowW, 63, wx + windowW, 92);
        if (lit.includes(i)) {
          g.fillStyle(0xd9b276, 0.22);
          g.fillRect(wx + 6, 110, windowW - 12, 34);
        }
        // window frame shadow
        g.lineStyle(2, 0x2a221c, 0.5);
        g.strokeRoundedRect(wx, 63, windowW, windowH, 3);
      }
      container.add(g);
      break;
    }
    case "sideWall": {
      g.fillStyle(color, 1);
      g.fillRoundedRect(0, 0, w, h, 4);
      g.fillStyle(shade(color, -18), 1);
      if (variant === "left") g.fillRect(w - 10, 0, 10, h);
      else g.fillRect(0, 0, 10, h);
      g.lineStyle(1, shade(color, -12), 0.7);
      for (let y = 10; y < h; y += 26) g.lineBetween(0, y, w, y);
      g.fillStyle(0x2f2a24, 0.2);
      g.fillRect(0, 0, w, h);
      container.add(g);
      break;
    }
    case "wall": {
      const wallColor = color === WOOD ? 0x6d5a46 : color;
      g.fillStyle(wallColor, 1);
      g.fillRect(0, 0, w, h);
      g.fillStyle(shade(wallColor, 18), 0.5);
      for (let y = 0; y < h; y += 34) g.fillRect(0, y, w, 2);
      g.fillStyle(shade(wallColor, -30), 1);
      g.fillRect(0, h - 8, w, 8);
      g.fillStyle(shade(wallColor, 26), 1);
      g.fillRect(0, h - 10, w, 2);
      container.add(g);
      break;
    }
    case "door": {
      const isEntrance = variant === "entrance";
      g.fillStyle(0x241d18, 0.45);
      g.fillRoundedRect(2, 4, w, h, 3);
      if (isEntrance) {
        g.fillStyle(shade(METAL_DARK, 8), 1);
        g.fillRoundedRect(0, 0, w, h, 3);
        g.lineStyle(2, METAL, 0.9);
        g.strokeRoundedRect(2, 2, w - 4, h - 4, 3);
        g.lineBetween(w / 2, 4, w / 2, h - 4);
        g.fillStyle(0x2a2f33, 1);
        g.fillRect(w * 0.12, h * 0.18, w * 0.26, h * 0.34);
        g.fillRect(w * 0.62, h * 0.18, w * 0.26, h * 0.34);
        g.fillStyle(0xd9a441, 1);
        g.fillCircle(w * 0.44, h * 0.55, 2.6);
        g.fillCircle(w * 0.56, h * 0.55, 2.6);
        g.fillStyle(0xe8dcc4, 0.85);
        g.fillRect(w * 0.76, h * 0.22, 14, 20);
      } else {
        g.fillStyle(shade(WOOD, -18), 1);
        g.fillRoundedRect(0, 0, w, h, 3);
        g.fillStyle(shade(WOOD, 6), 1);
        g.fillRoundedRect(4, 4, w - 8, h - 8, 2);
        g.fillStyle(shade(WOOD, -26), 1);
        g.fillRect(10, 10, w - 20, 24);
        g.fillStyle(0xd9a441, 1);
        g.fillCircle(w - 14, h / 2, 3);
      }
      container.add(g);
      if (prop.text) {
        const t = label(
          prop.text,
          w / 2,
          isEntrance ? -10 : 20,
          Math.max(9, Math.min(14, w / 8)),
          isEntrance ? "#e8dcc4" : "#f1e4cb",
        );
        container.add(t);
      }
      break;
    }
    case "sign": {
      g.fillStyle(0x2a3b33, 1);
      g.fillRoundedRect(0, 0, w, h, 4);
      g.lineStyle(2, 0xcfc1a8, 0.75);
      g.strokeRoundedRect(4, 4, w - 8, h - 8, 3);
      container.add(g);
      if (prop.text)
        container.add(
          label(prop.text, w / 2, h / 2, Math.max(10, Math.min(20, h / 2.2)), "#efe4cf"),
        );
      break;
    }
    case "noticeBoard": {
      g.fillStyle(0x4a3524, 1);
      g.fillRoundedRect(0, 0, w, h, 3);
      g.fillStyle(0x9b7448, 1);
      g.fillRoundedRect(5, 5, w - 10, h - 10, 2);
      const papers = [
        [12, 12, 34, 26, 0xe8dcc4],
        [52, 10, 28, 34, 0xd9c9a8],
        [86, 16, 36, 24, 0xf1e4cb],
        [20, 46, 30, 22, 0xe3d6bb],
        [58, 50, 32, 20, 0xcdbb97],
        [96, 46, 26, 26, 0xe8dcc4],
      ];
      papers.forEach(([px, py, pw, ph, pc]) => {
        g.fillStyle(pc, 1);
        g.fillRect(px, py, pw, ph);
        g.fillStyle(0x8a3d2f, 1);
        g.fillCircle(px + pw / 2, py + 3, 1.6);
      });
      container.add(g);
      break;
    }
    case "mailboxes": {
      g.fillStyle(METAL_DARK, 1);
      g.fillRoundedRect(0, 0, w, h, 2);
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 2; col += 1) {
          g.fillStyle(shade(METAL, 16), 1);
          g.fillRect(4 + col * (w / 2), 4 + row * (h / 3), w / 2 - 7, h / 3 - 6);
          g.fillStyle(0x2a2f33, 1);
          g.fillRect(8 + col * (w / 2), 8 + row * (h / 3), w / 2 - 15, 3);
        }
      }
      container.add(g);
      break;
    }
    case "bench": {
      const wood = variant === "green" ? 0x4f6350 : variant === "wood" ? WOOD : color;
      g.fillStyle(0x000000, 0.2);
      g.fillEllipse(w / 2, h - 2, w * 0.9, 8);
      g.fillStyle(shade(wood, -26), 1);
      g.fillRect(8, h - 14, 6, 14);
      g.fillRect(w - 14, h - 14, 6, 14);
      g.fillStyle(wood, 1);
      for (let i = 0; i < 4; i += 1) g.fillRoundedRect(4, h - 10 - i * 6, w - 8, 4, 1.5);
      g.fillStyle(shade(wood, 12), 1);
      g.fillRoundedRect(2, h - 32, w - 4, 6, 2);
      g.fillRoundedRect(2, h - 42, w - 4, 6, 2);
      g.fillStyle(shade(wood, -22), 1);
      g.fillRect(10, h - 28, 4, 16);
      g.fillRect(w - 14, h - 28, 4, 16);
      container.add(g);
      break;
    }
    case "tree": {
      const canopy = [0x7d7f4a, 0x9a7d3e, 0x6c7a4b, 0xb08a44];
      g.fillStyle(0x000000, 0.18);
      g.fillEllipse(w / 2, h - 6, w * 0.55, 16);
      if (variant === "birch") {
        g.fillStyle(0xd8d2c4, 1);
        g.fillRect(w / 2 - 8, h * 0.4, 16, h * 0.6);
        g.fillStyle(0x3a3733, 1);
        for (let i = 0; i < 7; i += 1) {
          g.fillRect(w / 2 - 8 + (i % 2) * 4, h * 0.45 + i * h * 0.075, 5 + (i % 3) * 3, 2.5);
        }
      } else {
        g.fillStyle(0x4a3828, 1);
        g.fillRect(w / 2 - 9, h * 0.42, 18, h * 0.58);
        g.fillRect(w / 2 - 16, h * 0.52, 8, h * 0.2);
      }
      const blobs: [number, number, number, number][] = [
        [0.5, 0.26, 0.34, 0],
        [0.3, 0.34, 0.24, 1],
        [0.7, 0.32, 0.26, 2],
        [0.42, 0.15, 0.22, 3],
        [0.6, 0.42, 0.2, 0],
        [0.36, 0.46, 0.18, 2],
      ];
      blobs.forEach(([bx, by, r, ci]) => {
        g.fillStyle(canopy[ci % canopy.length], 1);
        g.fillCircle(w * bx, h * by, w * r * 0.5);
      });
      g.fillStyle(0xd9a441, 0.8);
      for (let i = 0; i < 9; i += 1) {
        g.fillCircle(w * (0.24 + ((i * 37) % 55) / 100), h * (0.2 + ((i * 53) % 30) / 100), 2.2);
      }
      container.add(g);
      break;
    }
    case "bush": {
      g.fillStyle(0x000000, 0.16);
      g.fillEllipse(w / 2, h - 3, w, 9);
      const bushColors = [MOSS_DARK, MOSS, 0x74805a, 0x8a7f4a];
      g.fillStyle(bushColors[0], 1);
      g.fillEllipse(w * 0.36, h * 0.6, w * 0.6, h * 0.7);
      g.fillStyle(bushColors[1], 1);
      g.fillEllipse(w * 0.62, h * 0.55, w * 0.66, h * 0.8);
      g.fillStyle(bushColors[2], 1);
      g.fillEllipse(w * 0.48, h * 0.42, w * 0.55, h * 0.6);
      g.fillStyle(bushColors[3], 0.85);
      g.fillCircle(w * 0.3, h * 0.5, 2);
      g.fillCircle(w * 0.7, h * 0.44, 2.4);
      container.add(g);
      break;
    }
    case "plant": {
      g.fillStyle(0x8a5a3c, 1);
      g.fillRoundedRect(w * 0.2, h * 0.62, w * 0.6, h * 0.36, 2);
      g.fillStyle(0x6f4530, 1);
      g.fillRect(w * 0.2, h * 0.62, w * 0.6, 4);
      const leaves: [number, number, number, number][] = [
        [0.5, 0.2, 0.2, -0.3],
        [0.3, 0.36, 0.16, -0.9],
        [0.7, 0.34, 0.17, 0.8],
        [0.42, 0.44, 0.14, -0.4],
        [0.62, 0.48, 0.13, 0.5],
      ];
      leaves.forEach(([lx, ly, r, rot]) => {
        g.fillStyle(0x5e7049, 1);
        g.fillEllipse(w * lx, h * ly, w * r * 2, h * r * 1.4);
        g.fillStyle(0x72855a, 0.7);
        g.fillEllipse(w * lx + 2, h * ly - 2, w * r * 1.4, h * r * 0.9);
        g.lineStyle(1, 0x47553a, 0.5);
        g.lineBetween(
          w * lx,
          h * ly,
          w * lx + Math.cos(rot) * w * 0.15,
          h * ly - Math.sin(rot) * h * 0.15,
        );
      });
      container.add(g);
      break;
    }
    case "lamp": {
      g.fillStyle(0x000000, 0.2);
      g.fillEllipse(w / 2, h - 2, w, 6);
      g.fillStyle(0x343a3d, 1);
      g.fillRect(w / 2 - 3, h * 0.24, 6, h * 0.76);
      g.fillStyle(0x3f4649, 1);
      g.fillRect(w / 2 - 7, h - 5, 14, 5);
      g.fillStyle(0x2f3538, 1);
      g.fillRoundedRect(w / 2 - w * 0.32, h * 0.08, w * 0.64, h * 0.16, 3);
      g.fillStyle(0xe4bd76, 1);
      g.fillRoundedRect(w / 2 - w * 0.24, h * 0.1, w * 0.48, h * 0.1, 2);
      g.fillStyle(0xe4bd76, 0.1);
      g.fillCircle(w / 2, h * 0.16, w * 1.4);
      container.add(g);
      break;
    }
    case "puddle": {
      g.fillStyle(0x535f66, 0.55);
      g.fillEllipse(w / 2, h / 2, w, h);
      g.fillStyle(0x7f98a8, 0.35);
      g.fillEllipse(w * 0.42, h * 0.42, w * 0.7, h * 0.55);
      g.lineStyle(1, 0xb9c7cc, 0.4);
      g.strokeEllipse(w * 0.55, h * 0.58, w * 0.4, h * 0.25);
      container.add(g);
      break;
    }
    case "path": {
      g.fillStyle(0x6f6a5f, 0.9);
      g.fillRect(0, 0, w, h);
      g.fillStyle(0x7e786b, 0.7);
      for (let y = 0; y < h; y += 26) {
        for (let x = 0; x < w; x += 34) {
          g.fillRect(x + (y % 52 === 0 ? 4 : 0), y + 2, 30, 22);
        }
      }
      container.add(g);
      break;
    }
    case "rug": {
      g.fillStyle(0x7c3f33, 1);
      g.fillRect(0, 0, w, h);
      g.lineStyle(3, 0xd9a441, 0.55);
      g.strokeRect(6, 6, w - 12, h - 12);
      g.fillStyle(0x4c5d4a, 0.8);
      g.fillRect(w * 0.3, h * 0.2, w * 0.4, h * 0.6);
      g.lineStyle(1, 0xe8dcc4, 0.3);
      g.strokeRect(w * 0.34, h * 0.26, w * 0.32, h * 0.48);
      container.add(g);
      break;
    }
    case "mat": {
      g.fillStyle(0x8a6a43, 1);
      g.fillRoundedRect(0, 0, w, h, 2);
      g.lineStyle(1, 0x6b4f30, 0.8);
      for (let i = 3; i < w; i += 5) g.lineBetween(i, 2, i, h - 2);
      container.add(g);
      break;
    }
    case "bookshelf": {
      g.fillStyle(WOOD_DARK, 1);
      g.fillRect(0, 0, w, h);
      const rows = Math.max(2, Math.floor(h / 38));
      const bookColors = [0xa8553c, 0x4f6350, 0x3c5568, 0xb08a44, 0x7b6a86, 0x6e4a33];
      for (let row = 0; row < rows; row += 1) {
        const y = 6 + row * (h / rows);
        g.fillStyle(0x3b2a1d, 1);
        g.fillRect(5, y, w - 10, h / rows - 8);
        let x = 8;
        let i = 0;
        while (x < w - 10) {
          const bw = 5 + ((i * 7) % 9);
          const bh = h / rows - 14 - ((i * 5) % 8);
          g.fillStyle(bookColors[(i + row) % bookColors.length], 1);
          g.fillRect(x, y + (h / rows - 8 - bh), bw, bh);
          x += bw + 1.5;
          i += 1;
        }
        g.fillStyle(shade(WOOD, 8), 1);
        g.fillRect(4, y + h / rows - 7, w - 8, 3);
      }
      container.add(g);
      break;
    }
    case "fridge": {
      g.fillStyle(0xd8d2c4, 1);
      g.fillRoundedRect(0, 0, w, h, 4);
      g.fillStyle(0xbdb6a7, 1);
      g.fillRect(0, h * 0.34, w, 3);
      g.fillStyle(0x8f8a7d, 1);
      g.fillRect(w - 10, 10, 3, h * 0.18);
      g.fillRect(w - 10, h * 0.44, 3, h * 0.18);
      g.fillStyle(0xd9a441, 0.9);
      g.fillCircle(w * 0.32, h * 0.2, 3);
      g.fillStyle(0xa8553c, 0.9);
      g.fillRect(w * 0.5, h * 0.12, 6, 8);
      container.add(g);
      break;
    }
    case "counter":
    case "bar":
    case "kitchenette": {
      g.fillStyle(shade(WOOD, -20), 1);
      g.fillRect(0, h * 0.28, w, h * 0.72);
      g.fillStyle(shade(WOOD, 10), 0.5);
      for (let x = 20; x < w; x += 40) g.fillRect(x, h * 0.3, 2, h * 0.66);
      g.fillStyle(shade(WOOD_LIGHT, 12), 1);
      g.fillRoundedRect(-3, h * 0.18, w + 6, h * 0.14, 3);
      g.fillStyle(shade(WOOD, -40), 0.5);
      g.fillRect(0, h * 0.32, w, 3);
      if (prop.type === "kitchenette") {
        g.fillStyle(0x8f8a7d, 1);
        g.fillRect(w * 0.15, 0, w * 0.7, h * 0.2);
        g.fillStyle(0xbdb6a7, 1);
        g.fillRect(w * 0.2, 4, w * 0.28, h * 0.12);
      }
      container.add(g);
      break;
    }
    case "table": {
      g.fillStyle(0x000000, 0.18);
      g.fillEllipse(w / 2, h - 4, w * 0.9, 8);
      g.fillStyle(shade(WOOD_DARK, -10), 1);
      g.fillRect(w / 2 - 2, h * 0.5, 4, h * 0.45);
      g.fillStyle(WOOD, 1);
      g.fillEllipse(w / 2, h * 0.4, w, h * 0.55);
      g.fillStyle(shade(WOOD, 16), 1);
      g.fillEllipse(w / 2, h * 0.36, w * 0.92, h * 0.45);
      g.lineStyle(1, shade(WOOD, -20), 0.6);
      g.strokeEllipse(w / 2, h * 0.36, w * 0.7, h * 0.3);
      container.add(g);
      break;
    }
    case "chair": {
      g.fillStyle(0x000000, 0.16);
      g.fillEllipse(w / 2, h - 2, w, 5);
      g.fillStyle(shade(WOOD, -16), 1);
      g.fillRect(w * 0.2, h * 0.5, 4, h * 0.46);
      g.fillRect(w * 0.72, h * 0.5, 4, h * 0.46);
      g.fillStyle(WOOD, 1);
      g.fillRoundedRect(4, h * 0.36, w - 8, h * 0.22, 2);
      g.fillRoundedRect(4, h * 0.04, w - 8, h * 0.14, 2);
      g.fillStyle(WOOD_DARK, 1);
      g.fillRect(w * 0.14, h * 0.14, 3, h * 0.24);
      g.fillRect(w * 0.8, h * 0.14, 3, h * 0.24);
      container.add(g);
      break;
    }
    case "bed": {
      g.fillStyle(shade(WOOD, -20), 1);
      g.fillRoundedRect(0, 0, w, h, 4);
      g.fillStyle(0xe3d6bb, 1);
      g.fillRoundedRect(4, 4, w - 8, h - 8, 3);
      g.fillStyle(0x8d6a4a, 1);
      g.fillRoundedRect(0, h * 0.42, w, h * 0.58, 3);
      g.fillStyle(0xd6c4a4, 1);
      g.fillRoundedRect(w * 0.12, h * 0.08, w * 0.34, h * 0.26, 6);
      g.fillStyle(0xc9b48f, 1);
      g.fillRoundedRect(w * 0.56, h * 0.4, w * 0.4, h * 0.5, 3);
      g.lineStyle(1, 0x9c7a55, 0.6);
      for (let x = w * 0.58; x < w * 0.94; x += 8) g.lineBetween(x, h * 0.42, x, h * 0.88);
      container.add(g);
      break;
    }
    case "wardrobe": {
      g.fillStyle(WOOD_DARK, 1);
      g.fillRoundedRect(0, 0, w, h, 3);
      g.fillStyle(WOOD, 1);
      g.fillRoundedRect(4, 4, w / 2 - 6, h - 8, 2);
      g.fillRoundedRect(w / 2 + 2, 4, w / 2 - 6, h - 8, 2);
      g.fillStyle(0xd9a441, 1);
      g.fillCircle(w / 2 - 4, h / 2, 2.4);
      g.fillCircle(w / 2 + 4, h / 2, 2.4);
      container.add(g);
      break;
    }
    case "cabinet": {
      g.fillStyle(shade(WOOD, -24), 1);
      g.fillRoundedRect(0, 0, w, h, 3);
      const rows = Math.max(2, Math.floor(h / 32));
      for (let i = 0; i < rows; i += 1) {
        g.fillStyle(shade(WOOD, 4), 1);
        g.fillRect(4, 4 + i * (h / rows), w - 8, h / rows - 6);
        g.fillStyle(0xd9a441, 1);
        g.fillRect(w / 2 - 6, 4 + i * (h / rows) + h / rows / 2 - 6, 12, 2.4);
      }
      container.add(g);
      break;
    }
    case "tv": {
      g.fillStyle(0x24211d, 1);
      g.fillRoundedRect(0, 0, w, h * 0.72, 4);
      g.fillStyle(0x2f3b40, 1);
      g.fillRoundedRect(4, 4, w - 8, h * 0.55, 2);
      g.fillStyle(0x7f98a8, 0.16);
      g.fillRect(6, 6, w - 12, h * 0.2);
      g.fillStyle(0x1a1815, 1);
      g.fillRect(w * 0.35, h * 0.72, w * 0.3, h * 0.12);
      g.fillRect(w * 0.2, h * 0.84, w * 0.6, h * 0.08);
      container.add(g);
      break;
    }
    case "radiator": {
      g.fillStyle(0xcfc7b8, 1);
      for (let x = 0; x < w; x += 9) {
        g.fillRoundedRect(x, 0, 6, h, 2);
      }
      g.fillStyle(0x8f8a7d, 1);
      g.fillRect(0, h * 0.2, w, 3);
      g.fillRect(0, h * 0.7, w, 3);
      container.add(g);
      break;
    }
    case "mirror": {
      g.fillStyle(WOOD_DARK, 1);
      g.fillRoundedRect(0, 0, w, h, 3);
      g.fillStyle(0x9aa9ad, 1);
      g.fillRoundedRect(3, 3, w - 6, h - 6, 2);
      g.fillStyle(0xd9e2e3, 0.4);
      g.fillTriangle(6, h - 6, w - 6, 6, w - 6, h - 6);
      container.add(g);
      break;
    }
    case "picture": {
      g.fillStyle(0x3a2c20, 1);
      g.fillRect(0, 0, w, h);
      g.fillStyle(0xc9b48f, 1);
      g.fillRect(4, 4, w - 8, h - 8);
      g.fillStyle(0x7d8a6a, 1);
      g.fillRect(6, h * 0.55, w - 12, h * 0.35);
      g.fillStyle(0x9c6a4a, 1);
      g.fillCircle(w * 0.68, h * 0.32, w * 0.1);
      g.fillStyle(0xb08a44, 1);
      g.fillTriangle(6, h * 0.55, w * 0.4, h * 0.2, w * 0.62, h * 0.55);
      container.add(g);
      break;
    }
    case "clock": {
      g.fillStyle(0x3a2c20, 1);
      g.fillCircle(w / 2, h / 2, w / 2);
      g.fillStyle(PAPER, 1);
      g.fillCircle(w / 2, h / 2, w / 2 - 4);
      g.lineStyle(1, INK, 0.5);
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * Math.PI * 2;
        g.lineBetween(
          w / 2 + Math.cos(a) * (w / 2 - 8),
          h / 2 + Math.sin(a) * (w / 2 - 8),
          w / 2 + Math.cos(a) * (w / 2 - 5),
          h / 2 + Math.sin(a) * (w / 2 - 5),
        );
      }
      g.lineStyle(2, INK, 0.9);
      g.lineBetween(w / 2, h / 2, w / 2 + 7, h / 2 - 4);
      g.lineBetween(w / 2, h / 2, w / 2 - 2, h / 2 + 9);
      container.add(g);
      break;
    }
    case "poster":
    case "posterColumn": {
      if (prop.type === "posterColumn") {
        g.fillStyle(0x6f6a5f, 1);
        g.fillRoundedRect(0, 0, w, h, w / 2);
        g.fillStyle(0x8f8a7d, 0.6);
        g.fillRect(w * 0.2, 0, 3, h);
        g.fillStyle(0xd6c4a4, 1);
        g.fillRect(w * 0.3, h * 0.14, w * 0.4, h * 0.24);
        g.fillStyle(0x8a3d2f, 1);
        g.fillRect(w * 0.32, h * 0.44, w * 0.36, h * 0.16);
        g.fillStyle(0x2f3b40, 1);
        g.fillRect(w * 0.3, h * 0.66, w * 0.4, h * 0.14);
      } else {
        g.fillStyle(0x3a2c20, 1);
        g.fillRect(0, 0, w, h);
        g.fillStyle(0xa8553c, 1);
        g.fillRect(3, 3, w - 6, h - 6);
        g.fillStyle(0xe8dcc4, 1);
        g.fillRect(8, 8, w - 16, h * 0.18);
        g.fillStyle(0x2f3b40, 1);
        g.fillRect(8, h * 0.3, w - 16, h * 0.4);
        g.fillStyle(0xd9a441, 1);
        g.fillCircle(w / 2, h * 0.5, w * 0.12);
      }
      container.add(g);
      break;
    }
    case "papers":
    case "paper": {
      g.fillStyle(PAPER, 1);
      g.fillRect(0, 0, w, h);
      g.lineStyle(1, 0x8a7f6a, 0.6);
      for (let y = 5; y < h; y += 5) g.lineBetween(3, y, w - 3, y);
      container.add(g);
      break;
    }
    case "laundry": {
      g.lineStyle(1.6, 0xcfc7b8, 0.9);
      g.beginPath();
      g.moveTo(0, h * 0.18);
      g.lineTo(w, h * 0.26);
      g.strokePath();
      const cloth = [0xd8d2c4, 0xa8553c, 0x7b6a86, 0x4f6350, 0xd9c9a8];
      for (let i = 0; i < 7; i += 1) {
        const x = 14 + i * ((w - 24) / 7);
        const cw = 22 + (i % 3) * 10;
        const ch = 26 + (i % 4) * 12;
        g.fillStyle(cloth[i % cloth.length], 1);
        g.beginPath();
        g.moveTo(x, h * 0.2 + i * 2);
        g.lineTo(x + cw, h * 0.21 + i * 2);
        g.lineTo(x + cw - 2, h * 0.21 + ch);
        g.lineTo(x + 2, h * 0.2 + ch);
        g.closePath();
        g.fillPath();
        g.fillStyle(0x000000, 0.08);
        g.fillRect(x, h * 0.2 + ch * 0.7, cw, 4);
      }
      container.add(g);
      break;
    }
    case "sandbox": {
      g.fillStyle(0x000000, 0.12);
      g.fillEllipse(w / 2, h - 4, w, 8);
      g.fillStyle(shade(WOOD, -12), 1);
      g.fillRoundedRect(0, 0, w, h, 6);
      g.fillStyle(0xc9b48f, 1);
      g.fillRoundedRect(8, 8, w - 16, h - 16, 4);
      g.fillStyle(0xd9c9a8, 0.7);
      for (let i = 0; i < 20; i += 1) {
        g.fillCircle(12 + ((i * 37) % (w - 24)), 12 + ((i * 53) % (h - 24)), 1.4);
      }
      g.fillStyle(0x7b5a3e, 1);
      g.fillRect(w * 0.2, h * 0.3, w * 0.14, h * 0.2);
      g.fillCircle(w * 0.76, h * 0.56, w * 0.06);
      container.add(g);
      break;
    }
    case "swingSet": {
      g.fillStyle(shade(METAL, -10), 1);
      g.fillRect(4, 4, 4, h - 8);
      g.fillRect(w - 8, 14, 4, h - 18);
      g.fillRect(4, 8, w - 8, 5);
      g.lineStyle(1.4, 0x6a6f70, 1);
      g.lineBetween(w * 0.28, 12, w * 0.28, h * 0.52);
      g.lineBetween(w * 0.54, 12, w * 0.54, h * 0.52);
      g.fillStyle(0x8b5a3c, 1);
      g.fillRoundedRect(w * 0.22, h * 0.52, w * 0.38, 6, 2);
      g.lineStyle(1.4, 0x6a6f70, 1);
      g.lineBetween(w * 0.66, 12, w * 0.66, h * 0.7);
      g.lineBetween(w * 0.86, 12, w * 0.86, h * 0.7);
      g.fillStyle(0x8b5a3c, 1);
      g.fillRoundedRect(w * 0.62, h * 0.7, w * 0.28, 6, 2);
      container.add(g);
      break;
    }
    case "slide": {
      g.fillStyle(0x6a6f70, 1);
      g.fillRect(w * 0.2, h * 0.3, w * 0.5, 6);
      g.fillStyle(shade(METAL, 12), 1);
      g.fillRect(w * 0.26, h * 0.3, w * 0.44, h * 0.6);
      g.fillStyle(0x8b5a3c, 1);
      g.fillRect(w * 0.18, h * 0.26, w * 0.56, 5);
      g.fillStyle(0x7f8f95, 1);
      g.beginPath();
      g.moveTo(w * 0.68, h * 0.3);
      g.lineTo(w, h * 0.9);
      g.lineTo(w * 0.92, h * 0.94);
      g.lineTo(w * 0.6, h * 0.36);
      g.closePath();
      g.fillPath();
      container.add(g);
      break;
    }
    case "bins": {
      g.fillStyle(0x000000, 0.2);
      g.fillEllipse(w / 2, h - 3, w, 6);
      g.fillStyle(0x4a5d4a, 1);
      g.fillRoundedRect(2, 10, w * 0.42, h - 12, 3);
      g.fillStyle(0x5d6e55, 1);
      g.fillRoundedRect(4, 6, w * 0.38, 8, 3);
      g.fillStyle(0x3c4a3c, 1);
      g.fillRoundedRect(w * 0.52, 16, w * 0.42, h - 18, 3);
      g.fillStyle(0x4f5d47, 1);
      g.fillRoundedRect(w * 0.54, 12, w * 0.38, 8, 3);
      container.add(g);
      break;
    }
    case "bike": {
      g.lineStyle(2.4, 0x2f3538, 1);
      g.strokeCircle(w * 0.2, h * 0.7, h * 0.24);
      g.strokeCircle(w * 0.82, h * 0.7, h * 0.24);
      g.lineStyle(2, 0x8a3d2f, 1);
      g.lineBetween(w * 0.2, h * 0.7, w * 0.46, h * 0.34);
      g.lineBetween(w * 0.46, h * 0.34, w * 0.62, h * 0.7);
      g.lineBetween(w * 0.62, h * 0.7, w * 0.2, h * 0.7);
      g.lineBetween(w * 0.46, h * 0.34, w * 0.78, h * 0.3);
      g.lineBetween(w * 0.78, h * 0.3, w * 0.82, h * 0.7);
      g.fillStyle(0x2f3538, 1);
      g.fillRect(w * 0.38, h * 0.26, 16, 3);
      g.lineStyle(2, 0x2f3538, 1);
      g.lineBetween(w * 0.2, h * 0.7, w * 0.16, h * 0.5);
      container.add(g);
      break;
    }
    case "catBowl": {
      g.fillStyle(0x5e6b62, 1);
      g.fillEllipse(w / 2, h * 0.62, w, h * 0.7);
      g.fillStyle(0x8a8f86, 1);
      g.fillEllipse(w / 2, h * 0.5, w * 0.8, h * 0.4);
      g.fillStyle(0x6b5b45, 1);
      g.fillCircle(w * 0.42, h * 0.5, 2);
      g.fillCircle(w * 0.58, h * 0.48, 2.4);
      container.add(g);
      break;
    }
    case "leafPile": {
      const colors = [0xb08a44, 0xa8553c, 0xd9a441, 0x8a6a43];
      for (let i = 0; i < 16; i += 1) {
        g.fillStyle(colors[i % colors.length], 0.9);
        g.fillEllipse(
          (w * ((i * 37) % 100)) / 100,
          h - (h * ((i * 53) % 70)) / 100,
          8 + (i % 4) * 3,
          3 + (i % 3),
        );
      }
      container.add(g);
      break;
    }
    case "flowerbed": {
      g.fillStyle(0x5d4a36, 1);
      g.fillRoundedRect(0, h * 0.3, w, h * 0.7, 3);
      g.fillStyle(0x4a563c, 1);
      for (let i = 0; i < 9; i += 1) {
        g.fillCircle(8 + ((i * 41) % (w - 16)), h * 0.45 + ((i * 29) % (h * 0.4)), 5);
      }
      const petals = [0xc27a5a, 0xd9a441, 0xd8d2c4, 0x8a6a8a];
      for (let i = 0; i < 7; i += 1) {
        g.fillStyle(petals[i % petals.length], 1);
        g.fillCircle(10 + ((i * 47) % (w - 20)), h * 0.4 + ((i * 31) % (h * 0.45)), 2.4);
      }
      container.add(g);
      break;
    }
    case "car": {
      g.fillStyle(0x000000, 0.22);
      g.fillEllipse(w / 2, h - 6, w * 0.94, 10);
      const body = variant === "red" ? 0x8a3d2f : variant === "blue" ? 0x3c5568 : 0x5c5f58;
      g.fillStyle(body, 1);
      g.fillRoundedRect(0, h * 0.3, w, h * 0.5, 12);
      g.fillStyle(shade(body, 24), 1);
      g.fillRoundedRect(w * 0.18, h * 0.12, w * 0.56, h * 0.4, 10);
      g.fillStyle(0x2f3b40, 1);
      g.fillRoundedRect(w * 0.23, h * 0.16, w * 0.2, h * 0.28, 4);
      g.fillRoundedRect(w * 0.48, h * 0.16, w * 0.2, h * 0.28, 4);
      g.fillStyle(0x1f2123, 1);
      g.fillCircle(w * 0.22, h * 0.8, h * 0.13);
      g.fillCircle(w * 0.78, h * 0.8, h * 0.13);
      g.fillStyle(0x6f7276, 1);
      g.fillCircle(w * 0.22, h * 0.8, h * 0.06);
      g.fillCircle(w * 0.78, h * 0.8, h * 0.06);
      g.fillStyle(0xe8dcc4, 1);
      g.fillCircle(w * 0.94, h * 0.44, 3);
      container.add(g);
      break;
    }
    case "road": {
      g.fillStyle(0x3d3f40, 1);
      g.fillRect(0, 0, w, h);
      g.fillStyle(0x4a4c4d, 1);
      for (let i = 0; i < 40; i += 1) {
        g.fillCircle((w * ((i * 47) % 100)) / 100, (h * ((i * 61) % 100)) / 100, 1.5);
      }
      g.fillStyle(0xd9c9a8, 0.6);
      for (let x = 10; x < w; x += 70) g.fillRect(x, h / 2 - 2, 34, 4);
      container.add(g);
      break;
    }
    case "crosswalk": {
      g.fillStyle(0xded6c4, 0.8);
      const count = Math.max(3, Math.floor(w / 26));
      for (let i = 0; i < count; i += 1) {
        g.fillRect(i * (w / count), 0, (w / count) * 0.55, h);
      }
      container.add(g);
      break;
    }
    case "kiosk": {
      g.fillStyle(0x000000, 0.2);
      g.fillEllipse(w / 2, h - 4, w, 8);
      g.fillStyle(0x4f5d47, 1);
      g.fillRoundedRect(0, h * 0.1, w, h * 0.9, 4);
      g.fillStyle(0x2f3b40, 1);
      g.fillRoundedRect(w * 0.1, h * 0.22, w * 0.8, h * 0.4, 3);
      g.fillStyle(0xd9c9a8, 0.2);
      g.fillRect(w * 0.12, h * 0.24, w * 0.34, h * 0.36);
      g.fillStyle(0x8a3d2f, 1);
      for (let i = 0; i < 5; i += 1) g.fillRect(i * (w / 5), h * 0.16, w / 10, h * 0.12);
      g.fillStyle(0xe8dcc4, 1);
      g.fillRect(w * 0.6, h * 0.7, w * 0.26, h * 0.16);
      container.add(g);
      break;
    }
    case "turnstile": {
      g.fillStyle(0x3c4245, 1);
      g.fillRect(w * 0.42, h * 0.2, w * 0.16, h * 0.7);
      g.fillStyle(0x8f8a7d, 1);
      g.fillRoundedRect(0, h * 0.3, w, h * 0.1, 4);
      g.fillStyle(0xd9a441, 1);
      g.fillCircle(w * 0.5, h * 0.36, 3);
      g.fillStyle(0x2a2f33, 1);
      g.fillRect(w * 0.06, h * 0.86, w * 0.88, h * 0.1);
      container.add(g);
      break;
    }
    case "pillar": {
      g.fillStyle(shade(zone.palette === "metro" ? 0x6f6a5f : color, 12), 1);
      g.fillRoundedRect(0, 0, w, h, 3);
      g.fillStyle(0x000000, 0.15);
      g.fillRect(w * 0.66, 0, w * 0.2, h);
      g.fillStyle(shade(color, 30), 1);
      g.fillRect(0, 0, w, 8);
      g.fillRect(0, h - 8, w, 8);
      container.add(g);
      break;
    }
    case "arch": {
      g.fillStyle(shade(zone.palette === "apartment" ? 0x6d5a46 : 0x6f6a5f, -10), 1);
      g.fillRect(0, h * 0.1, w * 0.18, h * 0.9);
      g.fillRect(w * 0.82, h * 0.1, w * 0.18, h * 0.9);
      g.fillRoundedRect(0, 0, w, h * 0.26, 10);
      g.fillStyle(0x1b1916, 0.75);
      g.fillRoundedRect(w * 0.18, h * 0.24, w * 0.64, h * 0.76, 6);
      g.fillStyle(0xd9a441, 0.25);
      g.fillRect(w * 0.18, h * 0.24, w * 0.64, h * 0.76);
      container.add(g);
      break;
    }
    case "shopFacade":
    case "cafeFacade":
    case "dombytaFacade": {
      const facade =
        prop.type === "shopFacade" ? 0x6d5b47 : prop.type === "cafeFacade" ? 0x5a4438 : 0x6b615a;
      g.fillStyle(facade, 1);
      g.fillRect(0, 0, w, h);
      g.fillStyle(shade(facade, -26), 1);
      g.fillRect(0, 0, w, 16);
      g.fillStyle(shade(facade, 18), 1);
      g.fillRect(0, 16, w, 4);
      const awning = prop.type === "cafeFacade" ? 0x8a3d2f : 0x3f5a48;
      if (prop.type !== "dombytaFacade") {
        g.fillStyle(awning, 1);
        g.fillRoundedRect(w * 0.04, h * 0.34, w * 0.92, 26, 3);
        g.fillStyle(0xe8dcc4, 0.28);
        for (let x = w * 0.06; x < w * 0.94; x += 26) g.fillRect(x, h * 0.34, 12, 26);
      }
      g.fillStyle(shade(facade, -20), 1);
      g.fillRect(w * 0.06, 20, w * 0.88, 8);
      g.lineStyle(1, shade(facade, -12), 0.7);
      for (let y = 34; y < h * 0.3; y += 16) g.lineBetween(0, y, w, y);
      g.fillStyle(0x2a2f33, 0.55);
      g.fillRect(0, h * 0.86, w, h * 0.14);
      container.add(g);
      break;
    }
    case "shopWindow":
    case "cafeWindow": {
      const shut = variant === "closed";
      g.fillStyle(shut ? 0x5a5c59 : 0x2f3538, 1);
      g.fillRoundedRect(0, 0, w, h, 3);
      if (shut) {
        g.lineStyle(3, 0x4a4c49, 1);
        for (let x = 4; x < w; x += 9) g.lineBetween(x, 3, x, h - 3);
        g.fillStyle(0xe8dcc4, 0.55);
        g.fillRect(w * 0.25, h * 0.42, w * 0.5, 8);
      } else {
        g.fillStyle(0xc9a26a, 0.88);
        g.fillRect(4, 4, w - 8, h - 8);
        g.fillStyle(0x8a6a43, 0.35);
        g.fillRect(4, h * 0.62, w - 8, h * 0.36);
        g.fillStyle(0x2a2f33, 0.7);
        g.fillRect(w * 0.5 - 2, 4, 4, h - 8);
        g.fillRect(4, h * 0.42, w - 8, 4);
        g.fillStyle(0xe8dcc4, 0.12);
        g.fillTriangle(4, h - 4, w * 0.6, 4, w - 4, 4);
        if (prop.type === "cafeWindow") {
          g.fillStyle(0x2a2320, 0.65);
          g.fillCircle(w * 0.28, h * 0.68, 7);
          g.fillRect(w * 0.24, h * 0.72, 8, 12);
          g.fillCircle(w * 0.72, h * 0.7, 6);
          g.fillRect(w * 0.69, h * 0.74, 7, 10);
          g.fillStyle(0xd9a441, 0.5);
          g.fillCircle(w * 0.5, h * 0.24, 5);
        } else {
          g.fillStyle(0xa8553c, 0.7);
          for (let i = 0; i < 5; i += 1)
            g.fillRect(10 + i * ((w - 20) / 5), h * 0.56, (w - 20) / 5 - 4, 12);
        }
      }
      g.lineStyle(3, 0x3a2c20, 1);
      g.strokeRoundedRect(0, 0, w, h, 3);
      container.add(g);
      break;
    }
    case "windowRain": {
      g.fillStyle(0x3a2c20, 1);
      g.fillRoundedRect(0, 0, w, h, 3);
      g.fillStyle(0x46555c, 1);
      g.fillRect(4, 4, w - 8, h - 8);
      g.fillStyle(0x7f98a8, 0.22);
      g.fillRect(4, 4, w - 8, (h - 8) * 0.6);
      g.lineStyle(1.4, 0xb9c7cc, 0.5);
      for (let i = 0; i < Math.floor(w / 9); i += 1) {
        const x = 8 + ((i * 29) % (w - 16));
        g.lineBetween(x, 4, x - 3, 4 + ((i * 23) % (h - 12)));
      }
      g.fillStyle(0x3a2c20, 1);
      g.fillRect(w / 2 - 2, 4, 4, h - 8);
      g.fillRect(4, h * 0.5 - 2, w - 8, 4);
      g.fillStyle(0xd9a441, 0.12);
      g.fillRect(4, h * 0.6, w - 8, h * 0.4 - 4);
      container.add(g);
      break;
    }
    case "metroPavilion": {
      g.fillStyle(0x5f5a52, 1);
      g.fillRect(0, 0, w, h);
      g.fillStyle(0x6f6a5f, 1);
      g.fillRect(0, 0, w, 22);
      g.fillStyle(0x4a463f, 1);
      for (let x = 10; x < w; x += 34) g.fillRect(x, 22, 4, h * 0.7);
      g.fillStyle(0x3c3833, 1);
      g.fillRect(0, h * 0.86, w, h * 0.14);
      g.fillStyle(0xd9a441, 0.2);
      g.fillRect(0, h * 0.2, w, 6);
      container.add(g);
      break;
    }
    case "metroEntrance": {
      g.fillStyle(0x2a2723, 1);
      g.fillRoundedRect(0, 0, w, h, 6);
      g.fillStyle(0x14120f, 1);
      g.fillRoundedRect(10, 12, w - 20, h - 24, 4);
      g.fillStyle(0x3a3630, 1);
      for (let i = 0; i < 5; i += 1) {
        g.fillRect(16 + i * ((w - 32) / 5), 24 + i * 16, w - 32 - i * 8, 5);
      }
      g.fillStyle(0xd9a441, 0.22);
      g.fillTriangle(10, h - 12, w - 10, h - 12, 10, 30);
      g.fillStyle(0xd9a441, 1);
      g.fillRoundedRect(w * 0.3, 6, w * 0.4, 8, 3);
      container.add(g);
      if (prop.text) container.add(label(prop.text, w / 2, h * 0.4, 15, "#f1e4cb"));
      break;
    }
    case "roadMarking": {
      g.fillStyle(0xded6c4, 0.75);
      for (let x = 0; x < w; x += 80) g.fillRect(x, 0, 42, h);
      container.add(g);
      break;
    }
    case "busStop": {
      g.fillStyle(0x3c4245, 1);
      g.fillRect(0, 0, 6, h);
      g.fillRect(w - 6, 0, 6, h);
      g.fillStyle(0x5f6a6e, 0.55);
      g.fillRect(4, 4, w - 8, h * 0.5);
      g.fillStyle(0x2f3538, 1);
      g.fillRect(0, 0, w, 6);
      g.fillStyle(0x8b5a3c, 1);
      g.fillRect(w * 0.14, h * 0.62, w * 0.72, 6);
      g.fillStyle(0x4a3524, 1);
      g.fillRect(w * 0.18, h * 0.7, 4, h * 0.28);
      g.fillRect(w * 0.78, h * 0.7, 4, h * 0.28);
      g.fillStyle(0xd9a441, 0.85);
      g.fillCircle(w * 0.5, h * 0.22, 4);
      container.add(g);
      break;
    }
    case "tileWall": {
      g.fillStyle(0x6f6a5f, 1);
      g.fillRect(0, 0, w, h);
      g.lineStyle(1, 0x8f8a7d, 0.6);
      for (let y = 0; y < h; y += 22) {
        for (let x = 0; x < w; x += 34) {
          g.strokeRect(x + 1, y + 1, 32, 20);
        }
      }
      g.fillStyle(0xd9a441, 0.12);
      g.fillRect(0, h - 8, w, 8);
      container.add(g);
      break;
    }
    case "backShelves":
    case "teaShelf": {
      g.fillStyle(shade(WOOD_DARK, -14), 1);
      g.fillRect(0, 0, w, h);
      const goods =
        prop.type === "teaShelf"
          ? [0xb08a44, 0x8a3d2f, 0x4f6350, 0xd9c9a8]
          : [0xa8553c, 0xd9c9a8, 0x6f7a4a, 0x3c5568, 0xb08a44, 0x8a6a43];
      const rows = Math.max(2, Math.floor(h / 40));
      for (let row = 0; row < rows; row += 1) {
        const y = 8 + row * (h / rows);
        g.fillStyle(0x241d18, 1);
        g.fillRect(4, y, w - 8, h / rows - 12);
        let x = 8;
        let i = 0;
        while (x < w - 12) {
          const gw = 10 + ((i * 13) % 12);
          const gh = h / rows - 22 - ((i * 7) % 10);
          g.fillStyle(goods[(i + row * 3) % goods.length], 1);
          g.fillRoundedRect(x, y + (h / rows - 12 - gh), gw, gh, 2);
          if (prop.variant === "tea" || i % 3 === 0) {
            g.fillStyle(0xe8dcc4, 0.5);
            g.fillRect(x + 2, y + (h / rows - 12 - gh) + 4, gw - 4, 4);
          }
          x += gw + 3;
          i += 1;
        }
        g.fillStyle(shade(WOOD, 6), 1);
        g.fillRect(2, y + h / rows - 12, w - 4, 4);
      }
      container.add(g);
      break;
    }
    case "breadDisplay": {
      g.fillStyle(shade(WOOD_DARK, -8), 1);
      g.fillRoundedRect(0, 0, w, h, 3);
      const baskets: [number, number, number][] = [
        [w * 0.24, h * 0.35, 0],
        [w * 0.62, h * 0.35, 1],
        [w * 0.4, h * 0.68, 2],
      ];
      baskets.forEach(([bx, by, bi]) => {
        g.fillStyle(0x8b5a3c, 1);
        g.fillEllipse(bx, by, w * 0.36, h * 0.3);
        g.fillStyle(0x6f4530, 1);
        g.fillEllipse(bx, by - 3, w * 0.3, h * 0.2);
        for (let i = 0; i < 3; i += 1) {
          g.fillStyle(bi === 1 ? 0x9c6a3c : 0xc9a26a, 1);
          g.fillEllipse(bx - 8 + i * 9, by - 6, 15, 9);
          g.fillStyle(0xe8dcc4, 0.35);
          g.fillEllipse(bx - 9 + i * 9, by - 8, 6, 2.4);
        }
      });
      container.add(g);
      break;
    }
    case "pastryCase": {
      g.fillStyle(0x8f8a7d, 1);
      g.fillRoundedRect(0, 0, w, h, 3);
      g.fillStyle(0xcfc7b8, 0.35);
      g.fillRect(4, 4, w - 8, h - 8);
      g.fillStyle(0x8f8a7d, 1);
      for (let i = 1; i < 3; i += 1) g.fillRect(4, 4 + i * ((h - 8) / 3), w - 8, 3);
      const pastry = [0xc98a4b, 0xd9c9a8, 0x8a3d2f, 0xb08a44];
      for (let row = 0; row < 3; row += 1) {
        for (let i = 0; i < 4; i += 1) {
          g.fillStyle(pastry[(row + i) % pastry.length], 1);
          g.fillCircle(12 + i * ((w - 24) / 4), 4 + row * ((h - 8) / 3) + 10, 5);
        }
      }
      container.add(g);
      break;
    }
    case "basketStack": {
      for (let i = 0; i < 4; i += 1) {
        g.fillStyle(i % 2 === 0 ? 0x8b5a3c : 0x7b4c30, 1);
        g.fillRoundedRect(0, h * 0.15 + i * (h * 0.2), w, h * 0.16, 4);
        g.fillStyle(0x5c3a26, 1);
        g.fillRect(w * 0.15, h * 0.15 + i * (h * 0.2), w * 0.7, 4);
      }
      container.add(g);
      break;
    }
    case "priceTags": {
      g.fillStyle(0x2a3b33, 1);
      g.fillRect(0, 0, w, h);
      g.fillStyle(0xe8dcc4, 1);
      for (let i = 0; i < 3; i += 1) {
        g.fillRect(6 + i * ((w - 12) / 3), 5, (w - 16) / 3, h - 10);
      }
      container.add(g);
      break;
    }
    case "menuBoard": {
      g.fillStyle(0x3a2c20, 1);
      g.fillRoundedRect(0, 0, w, h, 2);
      g.fillStyle(0x2f3b33, 1);
      g.fillRect(3, 3, w - 6, h - 6);
      g.fillStyle(0xe8dcc4, 0.8);
      for (let i = 0; i < 5; i += 1) {
        g.fillRect(8, 10 + i * ((h - 16) / 5), (w - 16) * (0.4 + (i % 3) * 0.18), 2.5);
      }
      container.add(g);
      break;
    }
    case "barStool": {
      g.fillStyle(0x000000, 0.15);
      g.fillEllipse(w / 2, h - 2, w, 4);
      g.fillStyle(shade(METAL, -6), 1);
      g.fillRect(w / 2 - 2, h * 0.3, 4, h * 0.66);
      g.fillEllipse(w / 2, h * 0.98, w * 0.5, 4);
      g.fillStyle(shade(WOOD, 10), 1);
      g.fillEllipse(w / 2, h * 0.26, w, h * 0.24);
      container.add(g);
      break;
    }
    case "tableRound":
      {
        g.fillStyle(0x000000, 0.16);
        g.fillEllipse(w / 2, h - 4, w * 0.9, 8);
        g.fillStyle(shade(WOOD_DARK, -8), 1);
        g.fillRect(w / 2 - 3, h * 0.4, 6, h * 0.56);
        g.fillStyle(WOOD, 1);
        g.fillEllipse(w / 2, h * 0.36, w, h * 0.5);
        g.fillStyle(shade(WOOD, 14), 1);
        g.fillEllipse(w / 2, h * 0.32, w * 0.8, h * 0.32);
        g.fillStyle(0xe8dcc4, 0.9);
        g.fillEllipse(w * 0.62, h * 0.3, w * 0.24, h * 0.16);
        g.fillStyle(0x6b4f30, 1);
        g.fillEllipse(w * 0.3, h * 0.36, w * 0.16, h * 0.1);
      }
      container.add(g);
      break;
    case "espressoMachine": {
      g.fillStyle(METAL_DARK, 1);
      g.fillRoundedRect(0, 0, w, h, 4);
      g.fillStyle(0x8f8a7d, 1);
      g.fillRoundedRect(4, 4, w - 8, h * 0.4, 3);
      g.fillStyle(0x2a2f33, 1);
      g.fillRect(w * 0.2, h * 0.5, w * 0.26, h * 0.24);
      g.fillRect(w * 0.56, h * 0.5, w * 0.26, h * 0.24);
      g.fillStyle(0xd9a441, 1);
      g.fillCircle(w * 0.3, h * 0.24, 3.4);
      g.lineStyle(2, 0x8f8a7d, 1);
      g.lineBetween(w * 0.9, h * 0.3, w * 0.9, h * 0.7);
      container.add(g);
      break;
    }
    case "recordPlayer": {
      g.fillStyle(0x3a2c20, 1);
      g.fillRoundedRect(0, 0, w, h, 3);
      g.fillStyle(0x8a6a43, 1);
      g.fillRect(4, 4, w - 8, h - 8);
      g.fillStyle(0x1b1916, 1);
      g.fillCircle(w * 0.38, h * 0.5, h * 0.34);
      g.fillStyle(0xd9a441, 0.7);
      g.fillCircle(w * 0.38, h * 0.5, 3);
      g.lineStyle(2, 0x2a2320, 1);
      g.lineBetween(w * 0.76, h * 0.2, w * 0.62, h * 0.62);
      container.add(g);
      break;
    }
    case "coatRack": {
      g.fillStyle(shade(WOOD_DARK, 6), 1);
      g.fillRect(w / 2 - 2, h * 0.1, 4, h * 0.86);
      g.fillRect(w * 0.2, h * 0.94, w * 0.6, 4);
      g.fillStyle(0x5a4438, 1);
      g.fillRoundedRect(w * 0.12, h * 0.28, w * 0.34, h * 0.44, 4);
      g.fillStyle(0x3c5568, 1);
      g.fillRoundedRect(w * 0.55, h * 0.22, w * 0.3, h * 0.5, 4);
      container.add(g);
      break;
    }
    case "keyMachine": {
      g.fillStyle(0x3c4245, 1);
      g.fillRoundedRect(0, 0, w, h, 3);
      g.fillStyle(0x6f7276, 1);
      g.fillRoundedRect(4, 4, w - 8, h * 0.5, 2);
      g.fillStyle(0x8f8a7d, 1);
      g.fillCircle(w * 0.24, h * 0.3, h * 0.14);
      g.fillStyle(0xd9a441, 1);
      g.fillRect(w * 0.5, h * 0.62, w * 0.2, 4);
      g.fillStyle(0x2a2f33, 1);
      g.fillRect(w * 0.1, h * 0.62, w * 0.3, h * 0.2);
      container.add(g);
      break;
    }
    case "sewingMachine": {
      g.fillStyle(0x2a2320, 1);
      g.fillRoundedRect(0, 0, w, h, 3);
      g.fillStyle(0x8f8a7d, 1);
      g.fillRoundedRect(4, 4, w * 0.6, h * 0.3, 2);
      g.fillStyle(0x3c4245, 1);
      g.fillRect(w * 0.62, h * 0.3, 4, h * 0.4);
      g.fillStyle(0xd9a441, 1);
      g.fillCircle(w * 0.2, h * 0.24, 3);
      g.fillStyle(0x6b4f30, 1);
      g.fillRect(0, h * 0.82, w, h * 0.18);
      container.add(g);
      break;
    }
    case "metroMap": {
      g.fillStyle(0x1f2a2e, 1);
      g.fillRect(0, 0, w, h);
      g.fillStyle(0xe8dcc4, 0.18);
      g.fillRect(4, 4, w - 8, h - 8);
      const lines: [number, number][][] = [
        [
          [0.15, 0.6],
          [0.4, 0.3],
          [0.7, 0.4],
          [0.86, 0.2],
        ],
        [
          [0.2, 0.2],
          [0.45, 0.5],
          [0.6, 0.8],
        ],
        [
          [0.1, 0.8],
          [0.5, 0.65],
          [0.9, 0.75],
        ],
      ];
      [0xa8553c, 0x4f6350, 0xd9a441].forEach((c, i) => {
        g.lineStyle(3, c, 0.9);
        g.beginPath();
        lines[i].forEach(([x, y], j) => {
          if (j === 0) g.moveTo(w * x, h * y);
          else g.lineTo(w * x, h * y);
        });
        g.strokePath();
        lines[i].forEach(([x, y]) => {
          g.fillStyle(c, 1);
          g.fillCircle(w * x, h * y, 3);
        });
      });
      container.add(g);
      break;
    }
    case "ticketWindow": {
      g.fillStyle(0x3a3630, 1);
      g.fillRoundedRect(0, 0, w, h, 3);
      g.fillStyle(0xc9a26a, 0.4);
      g.fillRect(8, 8, w - 16, h * 0.5);
      g.fillStyle(0x2a2f33, 1);
      g.fillRect(8, h * 0.55, w - 16, 6);
      g.fillStyle(0xe8dcc4, 1);
      g.fillRect(w * 0.3, h * 0.72, w * 0.4, h * 0.16);
      container.add(g);
      break;
    }
    case "stairsDown": {
      g.fillStyle(0x14120f, 1);
      g.fillRoundedRect(0, 0, w, h, 4);
      for (let i = 0; i < 7; i += 1) {
        g.fillStyle(shade(0x3a3630, i * 4), 1);
        g.fillRect(10 + i * 6, 10 + i * (h / 9), w - 20 - i * 12, h / 12);
      }
      g.fillStyle(0x8f8a7d, 1);
      g.fillRect(4, h * 0.02, 5, h * 0.96);
      g.fillRect(w - 9, h * 0.02, 5, h * 0.96);
      g.fillStyle(0xd9a441, 0.14);
      g.fillTriangle(0, h, w, h, w * 0.5, h * 0.3);
      container.add(g);
      break;
    }
    case "bedsideTable": {
      g.fillStyle(shade(WOOD, -10), 1);
      g.fillRoundedRect(0, h * 0.2, w, h * 0.8, 2);
      g.fillStyle(shade(WOOD, 8), 1);
      g.fillRect(3, h * 0.28, w - 6, h * 0.3);
      g.fillStyle(0xd9a441, 1);
      g.fillCircle(w / 2, h * 0.42, 2);
      container.add(g);
      break;
    }
    case "ceilingLamp": {
      g.lineStyle(1.6, 0x2a2320, 0.9);
      g.lineBetween(w / 2, 0, w / 2, h * 0.4);
      g.fillStyle(0x8a6a43, 1);
      g.fillTriangle(w * 0.1, h * 0.9, w * 0.9, h * 0.9, w / 2, h * 0.35);
      g.fillStyle(0xe4bd76, 0.9);
      g.fillEllipse(w / 2, h * 0.88, w * 0.5, h * 0.16);
      g.fillStyle(0xe4bd76, 0.12);
      g.fillCircle(w / 2, h, w * 3);
      container.add(g);
      break;
    }
    case "phoneCharger": {
      g.lineStyle(2, 0xe8dcc4, 0.8);
      g.beginPath();
      g.moveTo(0, h * 0.2);
      g.lineTo(w * 0.4, h * 0.4);
      g.lineTo(w * 0.5, h * 0.9);
      g.strokePath();
      g.fillStyle(0x2a2f33, 1);
      g.fillRoundedRect(w * 0.55, h * 0.5, w * 0.3, h * 0.4, 2);
      g.fillStyle(0x8f8a7d, 1);
      g.fillRect(w * 0.6, h * 0.55, w * 0.2, h * 0.24);
      container.add(g);
      break;
    }
    case "cardboardBox": {
      g.fillStyle(0x9c7a55, 1);
      g.fillRect(0, 0, w, h);
      g.fillStyle(0x8a6a43, 1);
      g.fillRect(0, 0, w, 6);
      g.fillRect(w / 2 - 2, 0, 4, h);
      g.fillStyle(0xd9c9a8, 0.8);
      g.fillRect(w * 0.2, h * 0.3, w * 0.6, h * 0.2);
      container.add(g);
      break;
    }
    case "clockTower": {
      g.fillStyle(0x6f6a5f, 1);
      g.fillRect(0, 0, w, h);
      break;
    }
    case "musician": {
      g.fillStyle(0x2a2320, 1);
      g.fillEllipse(w / 2, h - 4, w * 0.9, 10);
      g.fillStyle(0x3c3a35, 1);
      g.fillRoundedRect(w * 0.32, h * 0.2, w * 0.36, h * 0.6, 8);
      g.fillStyle(0xd2a583, 1);
      g.fillCircle(w * 0.5, h * 0.22, w * 0.12);
      g.fillStyle(0x3a2c20, 1);
      g.fillRoundedRect(w * 0.4, h * 0.4, w * 0.2, h * 0.04, 2);
      g.fillStyle(0x8a6a43, 1);
      g.fillRoundedRect(w * 0.34, h * 0.6, w * 0.34, h * 0.22, 4);
      g.fillStyle(0x2a2320, 1);
      g.fillCircle(w * 0.5, h * 0.7, 4);
      container.add(g);
      break;
    }
    default: {
      g.fillStyle(color, 1);
      g.fillRoundedRect(0, 0, w, h, 3);
      g.fillStyle(shade(color, -26), 1);
      g.fillRect(0, h - 6, w, 6);
      container.add(g);
      break;
    }
  }

  if (prop.text && prop.type !== "door" && prop.type !== "sign") {
    container.add(label(prop.text, w / 2, h / 2, Math.max(9, Math.min(18, h / 2.2)), "#efe4cf"));
  }

  container.setDepth(isGroundProp(prop.type) ? -40 : prop.y + h);
  if (prop.scale) container.setScale(prop.scale);
  if (prop.flip) container.setScale(-1, 1);
  return container;
}
