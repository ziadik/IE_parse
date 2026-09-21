// tests/door-tiles.test.js
const path = require("path");
const { extractFileFromSave } = require("../src/parsers/sav");
const { parseAreFile } = require("../src/parsers/are");
const { parseBiffFile, extractByType } = require("../src/parsers/bif");
const { parseWedFile } = require("../src/parsers/wed");

const GAME_DIR = process.env.GAME_DIR || "I:\\BG";
const SAVE_DIR = process.env.SAVE_DIR || "I:\\BG\\Save\\000000001-Quick-Save";

const areBuffer = extractFileFromSave(
  path.join(SAVE_DIR, "BALDUR.SAV"),
  "AR2600.ARE",
);
const are = parseAreFile(areBuffer);

const biff = parseBiffFile(path.join(GAME_DIR, "data", "AREA2600.bif"));
const wed = parseWedFile(extractByType(biff, 0x03e9)[0].data);

console.log("Двери в WED:");
for (const d of wed.doors) {
  console.log(
    `  name=${d.name} state=${d.state} firstCell=${d.firstDoorTileCellIndex} count=${d.doorTileCellCount}`,
  );
}

console.log("\ndoorTileCells (первые 30):");
const cells = [];
for (let i = 0; i < Math.min(30, 4800); i++) {
  // door tile cells
  cells.push(wed.buffer ? 0 : 0); // у нас нет прямого доступа, посмотрим через are
}

// Найдём ячейки с secondaryTileIndex != 0xffff
const base = wed.overlays[0];
let secondaries = 0;
for (let i = 0; i < base.tilemap.length; i++) {
  const t = base.tilemap[i];
  if (t.secondaryTileIndex !== 0xffff) {
    secondaries++;
    if (secondaries <= 10) {
      const x = i % base.width,
        y = Math.floor(i / base.width);
      console.log(
        `  tilemap[${i}] @(${x},${y}): primary=${t.indices[0]} secondary=${t.secondaryTileIndex}`,
      );
    }
  }
}
console.log(`\nЯчеек с secondaryTileIndex != 0xffff: ${secondaries}`);
