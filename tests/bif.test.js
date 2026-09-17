const path = require("path");
const { parseBiffFile, extractByType } = require("../src/parsers/bif");

const BG_DIR = process.env.BG_DIR || "I:\\BG";
const biffPath = path.join(BG_DIR, "data", "AREA2600.bif");
const biff = parseBiffFile(biffPath);

console.log("=== BIF test ===");
console.log(`fileCount: ${biff.fileCount}`);
console.log(`tilesetCount: ${biff.tilesetCount}`);

for (const f of biff.files) {
  console.log(
    `  file[${f.fileIndex}] type=0x${f.type.toString(16)} (${f.typeName}) off=${f.offset} size=${f.size}`,
  );
}
for (const t of biff.tilesets) {
  console.log(
    `  tileset[${t.idx}] type=0x${t.type.toString(16)} off=${t.offset} count=${t.tileCount} tileSize=${t.tileSize}`,
  );
}

const weds = extractByType(biff, 0x03e9);
const bmps = extractByType(biff, 0x0001);

const asserts = [
  ["fileCount > 0", biff.fileCount > 0],
  ["tilesetCount == 1", biff.tilesetCount === 1],
  ["WED найден", weds.length > 0],
  ["BMP найдены (LM/SR/HT)", bmps.length === 3],
  ["TIS tileSize = 5120", biff.tilesets[0].tileSize === 5120],
  ["TIS tileCount > 1000", biff.tilesets[0].tileCount > 1000],
];
let ok = true;
for (const [label, cond] of asserts) {
  console.log(`${cond ? "✅" : "❌"} ${label}`);
  if (!cond) ok = false;
}
process.exit(ok ? 0 : 1);
