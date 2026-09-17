const path = require("path");
const { parseBiffFile } = require("../src/parsers/bif");
const { parseTisData } = require("../src/parsers/tis");

const BG_DIR = process.env.BG_DIR || "I:\\BG";
const biff = parseBiffFile(path.join(BG_DIR, "data", "AREA2600.bif"));
const ts = biff.tilesets[0];
const tis = parseTisData(biff.buffer, ts.offset, ts.tileCount, ts.tileSize);

console.log("=== TIS test ===");
console.log(`tileCount: ${tis.tileCount}`);
console.log(`tileSize:  ${tis.tileSize}`);

function showTile(idx) {
  const t = tis.tiles[idx];
  const colors = [];
  for (let j = 0; j < 8; j++) {
    colors.push(
      `${t.palette[j * 3]},${t.palette[j * 3 + 1]},${t.palette[j * 3 + 2]}`,
    );
  }
  console.log(`tile[${idx}]: ${colors.join(" | ")}`);
}

console.log("\nПалитры разных тайлов:");
showTile(0);
showTile(100);
showTile(500);
showTile(1000);
showTile(2000);
showTile(3000);
showTile(4000);

// colorKey check
const t0 = tis.tiles[0];
const ck = t0.palette[0] === 0 && t0.palette[1] === 255 && t0.palette[2] === 0;

// уникальные цвета
const allColors = new Set();
for (const t of tis.tiles) {
  for (let j = 1; j < 16; j++) {
    allColors.add(
      `${t.palette[j * 3]},${t.palette[j * 3 + 1]},${t.palette[j * 3 + 2]}`,
    );
  }
}
console.log(`\nУникальных цветов (первые 16 на тайл): ${allColors.size}`);

const asserts = [
  ["tileCount > 4000", tis.tileCount > 4000],
  ["tileSize == 5120", tis.tileSize === 5120],
  ["colorKey (0,255,0) в tile[0]", ck],
  ["уникальных цветов > 200", allColors.size > 200],
];
let ok = true;
for (const [label, cond] of asserts) {
  console.log(`${cond ? "✅" : "❌"} ${label}`);
  if (!cond) ok = false;
}
process.exit(ok ? 0 : 1);
