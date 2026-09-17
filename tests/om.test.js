// tests/om.test.js
const path = require("path");
const { parseBiffFile, extractByType } = require("../src/parsers/bif");
const { parseWedFile } = require("../src/parsers/wed");
const { parseTisData } = require("../src/parsers/tis");

const GAME_DIR = process.env.GAME_DIR || "I:\\BG";

const biff = parseBiffFile(path.join(GAME_DIR, "data", "AREA2600.bif"));
const wed = parseWedFile(extractByType(biff, 0x03e9)[0].data);
const ts = biff.tilesets[0];
const tis = parseTisData(biff.buffer, ts.offset, ts.tileCount, ts.tileSize);
const base = wed.overlays[0];
const { parseKeyFile } = require("../src/parsers/key");
const key = parseKeyFile(path.join(GAME_DIR, "chitin.key"));
const e = key.entries.find(
  (x) => x.resref.toUpperCase() === "WTPOOL" && x.type === 0x03eb,
);
const bifName = key.biffs[e.biffIndex].name;
const bif2 = parseBiffFile(path.join(GAME_DIR, bifName));
const ts2 = bif2.tilesets.find((t) => t.idx === e.tilesetIndex);
console.log(
  `\nWTPOOL tileset: off=${ts2.offset} count=${ts2.tileCount} size=${ts2.tileSize}`,
);
console.log(
  "hex @ offset (64 байт):",
  bif2.buffer.slice(ts2.offset, ts2.offset + 64).toString("hex"),
);
function ckCount(tile) {
  let n = 0;
  for (const p of tile.pixels) {
    if (
      tile.palette[p * 3] === 0 &&
      tile.palette[p * 3 + 1] === 255 &&
      tile.palette[p * 3 + 2] === 0
    )
      n++;
  }
  return n;
}

// --- 1. Распределение overlayFlags ---
const hist = {};
for (const t of base.tilemap) {
  hist[t.overlayFlags] = (hist[t.overlayFlags] || 0) + 1;
}
console.log("Распределение overlayFlags:");
for (const [k, v] of Object.entries(hist).sort((a, b) => b[1] - a[1])) {
  console.log(`  flags=${k} (0x${(+k).toString(16)}): ${v} ячеек`);
}

// --- 2. Сколько лужа/не лужа ---
let withHole = 0,
  withoutHole = 0;
for (const t of base.tilemap) {
  if (!(t.overlayFlags & 4)) continue;
  const tile = tis.tiles[t.indices[0]];
  const ck = ckCount(tile);
  if (ck > 300) withHole++;
  else withoutHole++;
}
console.log(
  `\nflags=4: с дыркой (лужа)=${withHole}, без дырки (баг)=${withoutHole}`,
);

// --- 3. Кластер flags=4 вокруг [30][40] ---
console.log("\nКластер вокруг [30][40]:");
for (let y = 28; y < 34; y++) {
  let row = "";
  for (let x = 38; x < 46; x++) {
    const t = base.tilemap[y * 80 + x];
    row += t.overlayFlags & 4 ? "W" : ".";
  }
  console.log(`  [${y}] ${row}`);
}

// --- 4. Bounding box color key для tile 2440 ---
const tile2440 = tis.tiles[2440];
let minX = 64,
  maxX = 0,
  minY = 64,
  maxY = 0,
  holes = 0;
for (let y = 0; y < 64; y++) {
  for (let x = 0; x < 64; x++) {
    const p = tile2440.pixels[y * 64 + x];
    if (
      tile2440.palette[p * 3] === 0 &&
      tile2440.palette[p * 3 + 1] === 255 &&
      tile2440.palette[p * 3 + 2] === 0
    ) {
      holes++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
console.log(
  `\ntile[2440] color key: ${holes}/4096 (${((holes / 4096) * 100).toFixed(1)}%)`,
);
console.log(`  bounding box: x=[${minX}..${maxX}] y=[${minY}..${maxY}]`);

// --- 5. Форма дырки — визуально ASCII ---
console.log("\nФорма дырки tile[2440] (64×64 → 32×32 ASCII):");
for (let y = 0; y < 64; y += 2) {
  let row = "";
  for (let x = 0; x < 64; x += 2) {
    const p = tile2440.pixels[y * 64 + x];
    const isCK =
      tile2440.palette[p * 3] === 0 &&
      tile2440.palette[p * 3 + 1] === 255 &&
      tile2440.palette[p * 3 + 2] === 0;
    row += isCK ? "." : "#";
  }
  console.log("  " + row);
}

// --- 6. Проверка разных ячеек ---
console.log("\nПроверка ячеек:");
for (const [y, x] of [
  [0, 0],
  [30, 40],
  [35, 45],
  [50, 20],
  [55, 70],
  [5, 70],
]) {
  const t = base.tilemap[y * 80 + x];
  const idx = t.indices[0];
  const tile = tis.tiles[idx];
  const ck = ckCount(tile);
  console.log(
    `  [${y}][${x}] flags=${t.overlayFlags} baseIdx=${idx} colorKey=${ck}/4096 (${((ck / 4096) * 100).toFixed(1)}%) palette=${tile.palette.slice(0, 9).join(",")}`,
  );
}
