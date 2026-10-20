#!/usr/bin/env node
/**
 * Generates the PWA icons as real PNG files with a tiny hand-rolled encoder.
 * Artwork: a doorway arch with warm light — the same visual language as the game.
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "apps/client/public/icons");
mkdirSync(outDir, { recursive: true });

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function png(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function renderIcon(size, maskable = false) {
  const ss = 4;
  const S = size * ss;
  const bg = [21, 18, 15];
  const bgWarm = [35, 27, 20];
  const amber = [217, 164, 65];
  const light = [232, 194, 126];
  const deep = [12, 10, 8];

  const scale = maskable ? 0.74 : 0.9;
  const cx = 0.5;
  const archTop = 0.5 - 0.09 * scale;
  const archBottom = 0.5 + 0.31 * scale;
  const halfW = 0.215 * scale;
  const ring = 0.048 * scale;

  const archContains = (nx, ny, half, top, bottom) => {
    if (ny > bottom) return false;
    if (ny >= top) return Math.abs(nx - cx) <= half;
    const r = half;
    return Math.hypot(nx - cx, ny - top) <= r && ny >= top - r;
  };

  const big = Buffer.alloc(S * S * 4);
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const nx = (x + 0.5) / S;
      const ny = (y + 0.5) / S;
      const i = (y * S + x) * 4;

      if (!maskable) {
        const radius = 0.215;
        const px = Math.min(Math.max(nx, radius), 1 - radius);
        const py = Math.min(Math.max(ny, radius), 1 - radius);
        if (Math.hypot(nx - px, ny - py) > radius) {
          big[i + 3] = 0;
          continue;
        }
      }

      const inner = archContains(nx, ny, halfW - ring, archTop + ring, archBottom);
      const arch = archContains(nx, ny, halfW, archTop, archBottom);
      const glowDist = Math.hypot((nx - cx) * 1.15, (ny - 0.62) * 0.9);
      const glow = Math.max(0, 1 - glowDist / 0.52) ** 2;

      let color = mix(bg, bgWarm, glow * 0.5 + (1 - ny) * 0.1);
      if (arch) color = inner ? mix(deep, [26, 21, 16], 0.4) : mix(color, amber, 0.95);

      const doorX0 = cx - halfW * 0.63;
      const doorX1 = cx + halfW * 0.63;
      const doorTop = archTop + (archBottom - archTop) * 0.38;
      if (nx >= doorX0 && nx <= doorX1 && ny >= doorTop && ny <= archBottom - ring * 0.25) {
        const t = (ny - doorTop) / Math.max(0.001, archBottom - doorTop);
        color = mix(light, [198, 132, 74], t * 0.55);
        // soft inner shadow at the sides so the opening reads as depth
        const edge = Math.min(nx - doorX0, doorX1 - nx) / (doorX1 - doorX0);
        color = mix([120, 78, 46], color, Math.min(1, edge * 5));
        // warm falloff toward the floor
        color = mix(color, [150, 96, 54], Math.max(0, t - 0.72) * 1.1);
      }
      // thin light lines on the threshold
      if (Math.abs(ny - (archBottom + 0.006)) < 0.004 && Math.abs(nx - cx) < halfW * 0.9) {
        color = mix(color, light, 0.28);
      }

      if (ny > archBottom && ny < archBottom + 0.012 && Math.abs(nx - cx) < halfW * 1.15) {
        color = mix(color, amber, 0.5);
      }

      if (Math.hypot(nx - (cx + halfW + 0.09), ny - (archTop - 0.09)) < 0.0105) {
        color = mix(color, amber, 0.9);
      }

      big[i] = Math.round(color[0]);
      big[i + 1] = Math.round(color[1]);
      big[i + 2] = Math.round(color[2]);
      big[i + 3] = 255;
    }
  }

  // downsample with a box filter (also antialiases the outer edge)
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < ss; sy += 1) {
        for (let sx = 0; sx < ss; sx += 1) {
          const i = ((y * ss + sy) * S + (x * ss + sx)) * 4;
          r += big[i];
          g += big[i + 1];
          b += big[i + 2];
          a += big[i + 3];
        }
      }
      const n = ss * ss;
      const o = (y * size + x) * 4;
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n);
      out[o + 3] = Math.round(a / n);
    }
  }
  return out;
}

const targets = [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["icon-512-maskable.png", 512, true],
  ["apple-touch-icon.png", 180, false],
  ["favicon.png", 48, false],
];

for (const [name, size, maskable] of targets) {
  const rgba = renderIcon(size, maskable);
  writeFileSync(path.join(outDir, name), png(size, size, rgba));
  console.log(`icons: ${name} (${size}×${size})${maskable ? " maskable" : ""}`);
}
