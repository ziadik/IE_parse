// test-palette.js
// Запуск: node test-palette.js

const fs = require("fs");
const path = require("path");

const BG_DIR = "I:\\BG";
const AREA = "AREA2600";

// ============ BIFF ============
function parseBiffFile(biffPath) {
  const buffer = fs.readFileSync(biffPath);
  const signature = buffer.toString("ascii", 0, 4);
  const version = buffer.toString("ascii", 4, 8);
  if (signature !== "BIFF") throw new Error(`Not BIFF: ${signature}`);

  const fileCount = buffer.readUInt32LE(0x08);
  const tilesetCount = buffer.readUInt32LE(0x0c);
  const entriesOff = buffer.readUInt32LE(0x10);

  const files = [];
  for (let i = 0; i < fileCount; i++) {
    const e = entriesOff + i * 16;
    const locator = buffer.readUInt32LE(e);
    const offset = buffer.readUInt32LE(e + 4);
    const size = buffer.readUInt32LE(e + 8);
    const type = buffer.readUInt16LE(e + 0x0c);
    files.push({ fileIndex: locator & 0x3fff, offset, size, type });
  }

  const tilesets = [];
  const tsOff = entriesOff + fileCount * 16;
  for (let i = 0; i < tilesetCount; i++) {
    const e = tsOff + i * 20;
    const locator = buffer.readUInt32LE(e);
    const offset = buffer.readUInt32LE(e + 4);
    const count = buffer.readUInt32LE(e + 8);
    const tileSize = buffer.readUInt32LE(e + 0xc);
    const type = buffer.readUInt16LE(e + 0x10);
    tilesets.push({
      idx: (locator >>> 14) & 0x3f,
      offset,
      count,
      tileSize,
      type,
    });
  }

  return { buffer, fileCount, tilesetCount, files, tilesets };
}

// ============ TIS / tile ============
// Читает палитру и пиксели ОДНОГО тайла.
function readTile(buffer, tileOffset, tileSize) {
  // Вариант A: палитра в начале (GemRB TISImporter)
  const paletteA = new Uint8Array(256 * 3);
  for (let j = 0; j < 256; j++) {
    const p = tileOffset + j * 4;
    paletteA[j * 3 + 0] = buffer[p + 2]; // R
    paletteA[j * 3 + 1] = buffer[p + 1]; // G
    paletteA[j * 3 + 2] = buffer[p + 0]; // B
  }
  const pixelsA = buffer.slice(tileOffset + 1024, tileOffset + 1024 + 4096);

  // Вариант B: палитра в конце
  const paletteB = new Uint8Array(256 * 3);
  for (let j = 0; j < 256; j++) {
    const p = tileOffset + 4096 + j * 4;
    paletteB[j * 3 + 0] = buffer[p + 2]; // R
    paletteB[j * 3 + 1] = buffer[p + 1]; // G
    paletteB[j * 3 + 2] = buffer[p + 0]; // B
  }
  const pixelsB = buffer.slice(tileOffset, tileOffset + 4096);

  // Вариант C: ARGB (сдвиг на 1)
  const paletteC = new Uint8Array(256 * 3);
  for (let j = 0; j < 256; j++) {
    const p = tileOffset + j * 4;
    paletteC[j * 3 + 0] = buffer[p + 3]; // R
    paletteC[j * 3 + 1] = buffer[p + 2]; // G
    paletteC[j * 3 + 2] = buffer[p + 1]; // B
  }

  return { paletteA, paletteB, paletteC, pixelsA, pixelsB };
}

// ============ Проверка ============
console.log(`BIF dir: ${BG_DIR}\\data`);
const biffPath = path.join(BG_DIR, "data", `${AREA}.bif`);
console.log(`Читаю: ${biffPath}\n`);

const biff = parseBiffFile(biffPath);
console.log(`fileCount=${biff.fileCount} tilesetCount=${biff.tilesetCount}`);
for (const t of biff.tilesets) {
  console.log(
    `  tileset: idx=${t.idx} type=0x${t.type.toString(16)} off=${t.offset} count=${t.count} tileSize=${t.tileSize}`,
  );
}

// Проверим первые байты первого тайла
const ts = biff.tilesets[0];
if (!ts) {
  console.log("Нет tileset-записей");
  process.exit(1);
}

console.log(`\n=== Первый тайл (offset=${ts.offset}) ===`);
console.log(
  "hex (64 байта):",
  biff.buffer.slice(ts.offset, ts.offset + 64).toString("hex"),
);

const tile = readTile(biff.buffer, ts.offset, ts.tileSize);

function showColors(label, palette, count = 8) {
  const parts = [];
  for (let j = 0; j < count; j++) {
    parts.push(`${palette[j * 3]},${palette[j * 3 + 1]},${palette[j * 3 + 2]}`);
  }
  console.log(`${label}: ${parts.join(" | ")}`);
}

console.log("\n--- Вариант A (палитра в начале, BGRA→RGB) ---");
showColors("tile[0]", tile.paletteA);
showColors(
  "tile[100]",
  readTile(biff.buffer, ts.offset + 100 * ts.tileSize, ts.tileSize).paletteA,
);

console.log("\n--- Вариант B (палитра в конце, BGRA→RGB) ---");
showColors("tile[0]", tile.paletteB);
showColors(
  "tile[100]",
  readTile(biff.buffer, ts.offset + 100 * ts.tileSize, ts.tileSize).paletteB,
);

console.log("\n--- Вариант C (ARGB→RGB, сдвиг на 1) ---");
showColors("tile[0]", tile.paletteC);
showColors(
  "tile[100]",
  readTile(biff.buffer, ts.offset + 100 * ts.tileSize, ts.tileSize).paletteC,
);

// ============ Пиксели ============
function pixelStats(pixels) {
  const hist = new Uint32Array(256);
  for (const p of pixels) hist[p]++;
  const unique = hist.filter((c) => c > 0).length;
  return {
    min: pixels.reduce((a, b) => Math.min(a, b), 255),
    max: pixels.reduce((a, b) => Math.max(a, b), 0),
    unique,
  };
}

console.log("\n--- Статистика пикселей ---");
const stA = pixelStats(tile.pixelsA);
console.log(
  `pixelsA (offset ${ts.offset}+1024): min=${stA.min} max=${stA.max} unique=${stA.unique}`,
);
const stB = pixelStats(tile.pixelsB);
console.log(
  `pixelsB (offset ${ts.offset}+0):    min=${stB.min} max=${stB.max} unique=${stB.unique}`,
);

// ============ Проверка color key ============
function findColorKey(palette) {
  for (let j = 0; j < 256; j++) {
    const r = palette[j * 3],
      g = palette[j * 3 + 1],
      b = palette[j * 3 + 2];
    if (r === 0 && g === 255 && b === 0) return j;
  }
  return -1;
}
console.log(
  `\nColorKey (0,255,0) найден в палитре A по индексу: ${findColorKey(tile.paletteA)}`,
);
console.log(
  `ColorKey (0,255,0) найден в палитре B по индексу: ${findColorKey(tile.paletteB)}`,
);
console.log(
  `ColorKey (0,255,0) найден в палитре C по индексу: ${findColorKey(tile.paletteC)}`,
);
