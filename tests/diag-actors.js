const fs = require("fs");
const path = require("path");
const { SAVE_DIR } = require("../src/server/version");
const { extractFileFromSave } = require("../src/parsers/sav");
const { parseAreFile, areHeaderParser } = require("../src/parsers/are");
const { parseCreHeader } = require("../src/parsers/cre");
const { parseBamFile } = require("../src/parsers/bam");

const GAME_DIR = process.env.GAME_DIR || "I:\\BG";
const areaName = "AR2600";

const areBuffer = extractFileFromSave(
  path.join(SAVE_DIR, "BALDUR.SAV"),
  `${areaName}.ARE`,
);
const are = parseAreFile(areBuffer);

console.log("Первый актор:");
console.log(JSON.stringify(are.actors[0], null, 2));

for (let i = 0; i < 5; i++) {
  const a = are.actors[i];
  const cre = parseCreHeader(areBuffer, a.creOffset);
  const dir = Math.floor((a.orientation || 0) / 2) % 8;
  console.log(
    `[${i}] orientation=${a.orientation} dir=${dir} animID=0x${cre.animationID.toString(16)}`,
  );
}

// Ищем BAM для первого актора
const { parseKeyFile } = require("../src/parsers/key");
const { parseBiffFile } = require("../src/parsers/bif");

const key = parseKeyFile(path.join(GAME_DIR, "chitin.key"));
const cre = parseCreHeader(areBuffer, are.actors[0].creOffset);

// Найдём avatars.2da prefix
const avatarsText = fs.readFileSync(
  path.join(GAME_DIR, "2da", "avatars.2da"),
  "ascii",
);
const animID = cre.animationID & 0xffff;
let prefix = null;
for (const line of avatarsText.split(/\r?\n/)) {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 8) continue;
  const id = parseInt(parts[0], 16);
  if (isNaN(id)) continue;
  if (id <= animID) prefix = parts[1];
  else break;
}
console.log(`\nAnimationID=0x${animID.toString(16)} prefix=${prefix}`);

const bamName = `${prefix}G1`;
console.log(`Ищем BAM: ${bamName}`);
const e = key.entries.find(
  (x) => x.resref.toUpperCase() === bamName && x.type === 0x03e8,
);
if (!e) {
  console.log(`❌ ${bamName} НЕ найден в KEY`);
} else {
  console.log(`✅ ${bamName}: biff=${e.biffIndex} idx=${e.fileIndex}`);
  const biff = parseBiffFile(path.join(GAME_DIR, key.biffs[e.biffIndex].name));
  const f = biff.files.find((x) => x.fileIndex === e.fileIndex);
  const bamBuf = biff.buffer.slice(f.offset, f.offset + f.size);
  const bam = parseBamFile(bamBuf);
  console.log(`  cycles: ${bam.cycles.length}, frames: ${bam.frameCount}`);
  for (let c = 0; c < Math.min(24, bam.cycles.length); c++) {
    console.log(`  cycle[${c}]: ${bam.cycles[c].length} frames`);
  }
}

// первые 0x60 байт первого актора
const off0 = are.actors[0] ? areHeaderParser.parse(areBuffer).offsetToActors : 0;
// Но проще — через сохранённый header
// Загрузим заново:
const areParsed = require("../src/parsers/are").parseAreFile(areBuffer);
// offsetToActors внутри — недоступно. Прочитаем напрямую:
const offsetToActors = areBuffer.readUInt32LE(0x54);
console.log("offsetToActors:", offsetToActors);
console.log("hex первого актора (первые 0x40 байт):",
  areBuffer.slice(offsetToActors, offsetToActors + 0x40).toString("hex"));
