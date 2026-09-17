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

// Найди ячейку с flags & 2
for (let y = 0; y < 60; y++) {
  for (let x = 0; x < 80; x++) {
    const t = base.tilemap[y * 80 + x];
    if (t.overlayFlags & 2) {
      const idx = t.indices[0];
      const tile = tis.tiles[idx];
      let ck = 0;
      for (const p of tile.pixels) {
        if (
          tile.palette[p * 3] === 0 &&
          tile.palette[p * 3 + 1] === 255 &&
          tile.palette[p * 3 + 2] === 0
        )
          ck++;
      }
      console.log(
        `[${y}][${x}] flags=${t.overlayFlags} tileIdx=${idx} colorKey=${ck}/4096 (${((ck / 4096) * 100).toFixed(1)}%)`,
      );
      process.exit(0);
    }
  }
}
