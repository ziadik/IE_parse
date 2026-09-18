const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { parseBiffFile } = require("../src/parsers/bif");
const { parseBamFile } = require("../src/parsers/bam");

const GAME_DIR = process.env.GAME_DIR || "I:\\BG";
const biff = parseBiffFile(path.join(GAME_DIR, "data", "CREAnim.bif"));

// Сохраним несколько первых BAM по индексу
const IDX = Number(process.env.IDX || 0);
const entry = biff.files[IDX];

const data = biff.buffer.slice(entry.offset, entry.offset + entry.size);
const parsed = parseBamFile(data);
console.log(
  `BAM[${IDX}] size=${entry.size} frameCount=${parsed.frameCount} cycles=${parsed.cycles.length}`,
);

// Сохраним первый кадр каждого цикла
(async () => {
  for (let i = 0; i < Math.min(3, parsed.cycles.length); i++) {
    const cycle = parsed.cycles[i];
    if (!cycle.length) continue;
    const fi = cycle[0];
    const f = parsed.frames[fi];
    const rgba = parsed.decodedFrames[fi];
    if (!rgba || !f.width) continue;
    await sharp(Buffer.from(rgba), {
      raw: { width: f.width, height: f.height, channels: 4 },
    })
      .png()
      .toFile(`bam-${IDX}-cycle${i}.png`);
    console.log(`  bam-${IDX}-cycle${i}.png (${f.width}x${f.height})`);
  }
})();
