import type Phaser from "phaser";
import type { ZoneId } from "@mir/shared";

/** Procedural textures — planks, asphalt, tiles, light glows, weather. */

const FLOOR_KEYS: Record<ZoneId, string> = {
  apartment: "floor-apartment",
  courtyard: "floor-courtyard",
  street: "floor-street",
  shop: "floor-shop",
  cafe: "floor-cafe",
  metro: "floor-metro",
  dombyta: "floor-dombyta",
};

function makeCanvas(scene: Phaser.Scene, key: string, size = 128): CanvasRenderingContext2D | null {
  if (scene.textures.exists(key)) return null;
  const texture = scene.textures.createCanvas(key, size, size);
  if (!texture) return null;
  const ctx = texture.getContext();
  return ctx;
}

function noise(ctx: CanvasRenderingContext2D, size: number, alpha: number, light = false): void {
  for (let i = 0; i < size * 3; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = light ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${Math.random() * alpha})`;
    ctx.fillRect(x, y, 1.4, 1.4);
  }
}

function wood(ctx: CanvasRenderingContext2D, size: number, base: string, line: string): void {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const plankH = size / 4;
  for (let row = 0; row < 4; row += 1) {
    ctx.fillStyle = row % 2 === 0 ? "rgba(255,235,200,0.05)" : "rgba(0,0,0,0.06)";
    ctx.fillRect(0, row * plankH, size, plankH);
    ctx.strokeStyle = line;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, row * plankH);
    ctx.lineTo(size, row * plankH);
    ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i += 1) {
      const y = row * plankH + 4 + Math.random() * (plankH - 8);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.3, y + 2, size * 0.6, y - 2, size, y + 1);
      ctx.stroke();
    }
    ctx.strokeStyle = line;
    ctx.beginPath();
    const seam = (row * 61) % size;
    ctx.moveTo(seam, row * plankH);
    ctx.lineTo(seam, (row + 1) * plankH);
    ctx.stroke();
  }
  noise(ctx, size, 0.06);
}

function asphalt(ctx: CanvasRenderingContext2D, size: number, base: string, mossy: boolean): void {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  for (let i = 0; i < 260; i += 1) {
    ctx.fillRect(Math.random() * size, Math.random() * size, 1.6, 1.6);
  }
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.moveTo(x, y);
    for (let p = 0; p < 4; p += 1) {
      x += (Math.random() - 0.5) * 40;
      y += (Math.random() - 0.5) * 40;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  if (mossy) {
    for (let i = 0; i < 9; i += 1) {
      ctx.fillStyle = `rgba(92,110,73,${0.1 + Math.random() * 0.12})`;
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * size,
        Math.random() * size,
        8 + Math.random() * 16,
        5 + Math.random() * 9,
        Math.random(),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
  noise(ctx, size, 0.1);
}

function slabs(
  ctx: CanvasRenderingContext2D,
  size: number,
  base: string,
  line: string,
  slab: number,
): void {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  for (let y = 0; y <= size; y += slab) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(size, y + 0.5);
    ctx.stroke();
  }
  for (let row = 0; row < size / slab; row += 1) {
    const offset = row % 2 === 0 ? 0 : slab / 2;
    for (let x = offset; x <= size; x += slab) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, row * slab);
      ctx.lineTo(x + 0.5, (row + 1) * slab);
      ctx.stroke();
    }
  }
  for (let i = 0; i < 40; i += 1) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, slab - 4, slab - 4);
  }
  noise(ctx, size, 0.08);
}

export function ensureTextures(scene: Phaser.Scene): void {
  const size = 128;

  let ctx = makeCanvas(scene, FLOOR_KEYS.apartment, size);
  if (ctx) {
    wood(ctx, size, "#6b4d33", "#4a3322");
    (scene.textures.get(FLOOR_KEYS.apartment) as Phaser.Textures.CanvasTexture).refresh();
  }

  ctx = makeCanvas(scene, FLOOR_KEYS.cafe, size);
  if (ctx) {
    wood(ctx, size, "#5f4730", "#3f2d1e");
    ctx.fillStyle = "rgba(40,26,16,0.18)";
    ctx.fillRect(0, 0, size, size);
    (scene.textures.get(FLOOR_KEYS.cafe) as Phaser.Textures.CanvasTexture).refresh();
  }

  ctx = makeCanvas(scene, FLOOR_KEYS.courtyard, size);
  if (ctx) {
    asphalt(ctx, size, "#4c4d4a", true);
    (scene.textures.get(FLOOR_KEYS.courtyard) as Phaser.Textures.CanvasTexture).refresh();
  }

  ctx = makeCanvas(scene, FLOOR_KEYS.street, size);
  if (ctx) {
    slabs(ctx, size, "#5c5b55", "rgba(30,29,26,0.55)", 42);
    (scene.textures.get(FLOOR_KEYS.street) as Phaser.Textures.CanvasTexture).refresh();
  }

  ctx = makeCanvas(scene, FLOOR_KEYS.shop, size);
  if (ctx) {
    ctx.fillStyle = "#8c8577";
    ctx.fillRect(0, 0, size, size);
    const tile = 32;
    for (let y = 0; y < size; y += tile) {
      for (let x = 0; x < size; x += tile) {
        ctx.fillStyle = (x / tile + y / tile) % 2 === 0 ? "#969081" : "#847e70";
        ctx.fillRect(x, y, tile, tile);
        ctx.strokeStyle = "rgba(50,48,42,0.25)";
        ctx.strokeRect(x + 0.5, y + 0.5, tile - 1, tile - 1);
      }
    }
    noise(ctx, size, 0.06);
    (scene.textures.get(FLOOR_KEYS.shop) as Phaser.Textures.CanvasTexture).refresh();
  }

  ctx = makeCanvas(scene, FLOOR_KEYS.metro, size);
  if (ctx) {
    ctx.fillStyle = "#8f8b80";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(60,58,52,0.3)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 30; i += 1) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * size, 0);
      ctx.bezierCurveTo(
        Math.random() * size,
        size * 0.3,
        Math.random() * size,
        size * 0.7,
        Math.random() * size,
        size,
      );
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(40,38,34,0.35)";
    for (let x = 0; x <= size; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    noise(ctx, size, 0.05);
    (scene.textures.get(FLOOR_KEYS.metro) as Phaser.Textures.CanvasTexture).refresh();
  }

  ctx = makeCanvas(scene, FLOOR_KEYS.dombyta, size);
  if (ctx) {
    ctx.fillStyle = "#6a6560";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let i = 0; i < 60; i += 1) ctx.fillRect(Math.random() * size, Math.random() * size, 3, 3);
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * size, 0);
      ctx.lineTo(Math.random() * size, size);
      ctx.stroke();
    }
    (scene.textures.get(FLOOR_KEYS.dombyta) as Phaser.Textures.CanvasTexture).refresh();
  }

  // radial glow for lamps and warm windows
  if (!scene.textures.exists("glow")) {
    const glow = scene.textures.createCanvas("glow", 256, 256);
    if (glow) {
      const gctx = glow.getContext();
      const gradient = gctx.createRadialGradient(128, 128, 4, 128, 128, 126);
      gradient.addColorStop(0, "rgba(255,214,150,0.95)");
      gradient.addColorStop(0.35, "rgba(255,196,120,0.35)");
      gradient.addColorStop(1, "rgba(255,180,100,0)");
      gctx.fillStyle = gradient;
      gctx.fillRect(0, 0, 256, 256);
      glow.refresh();
    }
  }

  if (!scene.textures.exists("leaf")) {
    const leaf = scene.textures.createCanvas("leaf", 12, 10);
    if (leaf) {
      const lctx = leaf.getContext();
      lctx.fillStyle = "#c08a3e";
      lctx.beginPath();
      lctx.ellipse(6, 5, 5, 3, 0.5, 0, Math.PI * 2);
      lctx.fill();
      leaf.refresh();
    }
  }

  if (!scene.textures.exists("dot")) {
    const dot = scene.textures.createCanvas("dot", 8, 8);
    if (dot) {
      const dctx = dot.getContext();
      const gradient = dctx.createRadialGradient(4, 4, 0, 4, 4, 4);
      gradient.addColorStop(0, "rgba(255,240,215,0.9)");
      gradient.addColorStop(1, "rgba(255,240,215,0)");
      dctx.fillStyle = gradient;
      dctx.fillRect(0, 0, 8, 8);
      dot.refresh();
    }
  }

  if (!scene.textures.exists("rain")) {
    const rain = scene.textures.createCanvas("rain", 128, 128);
    if (rain) {
      const rctx = rain.getContext();
      rctx.strokeStyle = "rgba(200,220,235,0.5)";
      rctx.lineWidth = 1;
      for (let i = 0; i < 26; i += 1) {
        const x = Math.random() * 128;
        const y = Math.random() * 128;
        rctx.beginPath();
        rctx.moveTo(x, y);
        rctx.lineTo(x - 4, y + 14);
        rctx.stroke();
      }
      rain.refresh();
    }
  }
}

export function floorKey(zone: ZoneId): string {
  return FLOOR_KEYS[zone];
}
