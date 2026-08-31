import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SIZE = 1024;

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(pixels) {
  const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
  for (let y = 0; y < SIZE; y++) {
    const row = y * (SIZE * 4 + 1);
    raw[row] = 0;
    pixels.copy(raw, row + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function mix(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

const pixels = Buffer.alloc(SIZE * SIZE * 4);
const bgA = [10, 8, 20];
const bgB = [6, 5, 12];
const moon = [243, 236, 224];
const gold = [232, 181, 106];

function set(x, y, rgb, a = 255) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  const w = a / 255;
  pixels[i] = Math.round(pixels[i] * (1 - w) + rgb[0] * w);
  pixels[i + 1] = Math.round(pixels[i + 1] * (1 - w) + rgb[1] * w);
  pixels[i + 2] = Math.round(pixels[i + 2] * (1 - w) + rgb[2] * w);
  pixels[i + 3] = 255;
}

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const nx = x / SIZE;
    const ny = y / SIZE;
    const glow = Math.exp(-((nx - 0.42) ** 2 + (ny - 0.38) ** 2) * 6);
    const rgb = mix(bgB, [28, 22, 42], glow * 0.55);
    const i = (y * SIZE + x) * 4;
    pixels[i] = rgb[0];
    pixels[i + 1] = rgb[1];
    pixels[i + 2] = rgb[2];
    pixels[i + 3] = 255;
  }
}

function disc(cx, cy, r, rgb, softness = 2) {
  const r2 = r * r;
  const outer = (r + softness) * (r + softness);
  for (let y = Math.floor(cy - r - softness); y <= cy + r + softness; y++) {
    for (let x = Math.floor(cx - r - softness); x <= cx + r + softness; x++) {
      const d = (x - cx) ** 2 + (y - cy) ** 2;
      if (d > outer) continue;
      const a = d <= r2 ? 255 : Math.max(0, 255 * (1 - (Math.sqrt(d) - r) / softness));
      set(x, y, rgb, a);
    }
  }
}

function crescent() {
  const cx = 470;
  const cy = 530;
  const r = 310;
  const cutX = 590;
  const cutY = 470;
  const cutR = 280;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const d1 = Math.hypot(x - cx, y - cy);
      const d2 = Math.hypot(x - cutX, y - cutY);
      const edge = Math.max(0, Math.min(1, (r + 2.4 - d1) / 2.4));
      const hole = Math.max(0, Math.min(1, (d2 - (cutR - 2.2)) / 2.2));
      const a = edge * hole;
      if (a <= 0) continue;
      const t = Math.max(0, (x - 280) / 500);
      set(x, y, mix(moon, gold, t * 0.22), a * 255);
    }
  }
}

crescent();
disc(730, 250, 7, gold, 3);
disc(250, 220, 3.2, moon, 2);
disc(300, 160, 2.2, gold, 2);
disc(820, 720, 2.6, moon, 2);
disc(180, 760, 2, gold, 2);

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "..", "src-tauri", "icons", "icon.png");
fs.writeFileSync(out, png(pixels));
console.log("wrote", out);
