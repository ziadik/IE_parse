// tests/diag-doors.test.js
const fs = require("fs");
const path = require("path");
const { GAME_DIR, SAVE_DIR } = require("../src/server/version");
const { getBiff, areaBifName } = require("../src/server/lib/cache");
const { extractFileFromSave } = require("../src/parsers/sav");
const { parseAreFile } = require("../src/parsers/are");
const { parseWedFile } = require("../src/parsers/wed");
const { extractByType } = require("../src/parsers/bif");

const areaName = "AR2600";
const biff = getBiff(path.join(GAME_DIR, "data", areaBifName(areaName)));
const wedBuffer = extractByType(biff, 0x03e9)[0].data;
const wed = parseWedFile(wedBuffer);
wed.buffer = wedBuffer;
const base = wed.overlays[0];

const areBuffer = extractFileFromSave(
  path.join(SAVE_DIR, "BALDUR.SAV"),
  `${areaName}.ARE`,
);
const are = parseAreFile(areBuffer);

for (const areDoor of are.doors) {
  const wedDoor = wed.doors.find(
    (w) => w.name.toUpperCase() === areDoor.doorId.toUpperCase(),
  );
  if (!wedDoor) continue;

  console.log(`\n=== ${areDoor.doorId} ===`);
  console.log(`  isOpen=${areDoor.isOpen} state=${wedDoor.state}`);
  console.log(`  cells: ${wedDoor.doorTileCellCount}`);
  for (let k = 0; k < wedDoor.doorTileCellCount; k++) {
      const off =
      wed.offsetToDoorTileCells + (wedDoor.firstDoorTileCellIndex + k) * 2;
      const tilemapIdx = wedBuffer.readUInt16LE(off);
      const cell = base.tilemap[tilemapIdx];
      console.log(`    wFlags=${cell.wFlags} overlayFlags=${cell.overlayFlags}`);
    console.log(
      `  cell[${k}] tilemapIdx=${tilemapIdx} @(${(tilemapIdx % base.width) * 64},${Math.floor(tilemapIdx / base.width) * 64})`,
    );
    console.log(
      `    primaryTis=${cell.indices[0]} secondaryTis=${cell.secondaryTileIndex}`,
    );
  }
}
