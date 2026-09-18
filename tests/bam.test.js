const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { parseKeyFile } = require("../src/parsers/key");
const { parseBiffFile } = require("../src/parsers/bif");
const { parseBamFile } = require("../src/parsers/bam");

const GAME_DIR = process.env.GAME_DIR || "I:\\BG";
const RESREF = process.env.BAM || "FLAME2S";

const key = parseKeyFile(path.join(GAME_DIR, "chitin.key"));
const bam = key.entries.find(
  (x) => x.resref.toUpperCase() === RESREF && x.type === 0x03e8,
);
if (!bam) {
  console.log(`${RESREF}.BAM не найден`);
  // покажем список первых 20 BAM
  const allBams = key.entries.filter((x) => x.type === 0x03e8).slice(0, 20);
  console.log("Первые BAM в KEY:");
  for (const b of allBams)
    console.log(`  ${b.resref} (biff=${b.biffIndex}, idx=${b.fileIndex})`);
  process.exit(1);
}

console.log(
  `BAM: ${bam.resref} (biffIndex=${bam.biffIndex}, fileIndex=${bam.fileIndex})`,
);

const bifName = key.biffs[bam.biffIndex].name;
const biff = parseBiffFile(path.join(GAME_DIR, bifName));
const entry = biff.files.find((f) => f.fileIndex === bam.fileIndex);
const data = biff.buffer.slice(entry.offset, entry.offset + entry.size);

console.log(`  size=${entry.size}`);
const parsed = parseBamFile(data);
console.log(`  version=${parsed.version}`);
console.log(
  `  frameCount=${parsed.frameCount}, cycleCount=${parsed.cycleCount}, colorCount=${parsed.colorCount}`,
);
console.log(`  frames (first 5):`);
for (let i = 0; i < Math.min(5, parsed.frames.length); i++) {
  const f = parsed.frames[i];
  console.log(
    `    [${i}] ${f.width}x${f.height} @(${f.x},${f.y}) off=${f.dataOffset}`,
  );
}
console.log(
  `  cycles (length of each): ${parsed.cycles.map((c) => c.length).join(",")}`,
);

// Сохраним кадры первого цикла
const cycle = parsed.cycles[0] || [];
const toSave = cycle.length ? cycle.slice(0, 8) : [0];
console.log(`Сохраняем ${toSave.length} кадров...`);

(async () => {
  for (let k = 0; k < toSave.length; k++) {
    const fi = toSave[k];
    const f = parsed.frames[fi];
    const rgba = parsed.decodedFrames[fi];
    if (!rgba || f.width === 0 || f.height === 0) {
      console.log(`  frame[${fi}] пустой`);
      continue;
    }
    const out = `debug-bam-${k}.png`;
    await sharp(Buffer.from(rgba), {
      raw: { width: f.width, height: f.height, channels: 4 },
    })
      .png()
      .toFile(out);
    console.log(`  ✅ ${out} (${f.width}x${f.height})`);
  }
})();
