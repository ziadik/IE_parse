const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { GAME_DIR, CACHE_DIR } = require("../src/server/version");
const { getBiff, getKey } = require("../src/server/lib/cache");
const { parseTisData } = require("../src/parsers/tis");
const { decodeTileToRGBA } = require("../src/prep/tiles");

(async () => {
  const key = getKey();
  const e = key.entries.find(
    (x) => x.resref.toUpperCase() === "AR2600" && x.type === 0x03eb,
  );
  const biff = getBiff(path.join(GAME_DIR, key.biffs[e.biffIndex].name));
  const ts = biff.tilesets.find((t) => t.idx === e.tilesetIndex);
  const tis = parseTisData(biff.buffer, ts.offset, ts.tileCount, ts.tileSize);

  // Сравниваем пары primary/secondary для DOOR2618
  const pairs = [
    [2984, 4822],
    [3063, 4823],
    [3064, 4824],
    [2983, 4821],
  ];
  const outDir = path.join(CACHE_DIR, "AR2600", "compare");
  fs.mkdirSync(outDir, { recursive: true });

  for (const [p, s] of pairs) {
    for (const [label, idx] of [
      ["primary", p],
      ["secondary", s],
    ]) {
      const tile = decodeTileToRGBA(tis.tiles[idx]);
      await sharp(Buffer.from(tile), {
        raw: { width: 64, height: 64, channels: 4 },
      })
        .png()
        .toFile(path.join(outDir, `${label}-${idx}.png`));
      console.log(`${label}-${idx}.png`);
    }
  }
})();
