// tests/animate-ids.test.js
const path = require("path");
const fs = require("fs");
const { parseKeyFile } = require("../src/parsers/key");
const { parseBiffFile } = require("../src/parsers/bif");

const GAME_DIR = process.env.GAME_DIR || "I:\\BG";
const key = parseKeyFile(path.join(GAME_DIR, "chitin.key"));

// Ищем ANIMATE.IDS (тип 0x03f2 — IDS)
const entry = key.entries.find(
  (x) => x.resref.toUpperCase() === "ANIMATE" && x.type === 0x03f2,
);
if (!entry) {
  console.log("ANIMATE.IDS не найден в KEY");
  // покажем все IDS
  const all = key.entries.filter((e) => e.type === 0x03f2);
  console.log(`Всего IDS в KEY: ${all.length}`);
  for (const e of all.slice(0, 30)) console.log(`  ${e.resref}.IDS`);
  process.exit(1);
}
console.log("ANIMATE.IDS:", entry);

const bifName = key.biffs[entry.biffIndex].name;
const bif = parseBiffFile(path.join(GAME_DIR, bifName));
const f = bif.files.find((x) => x.fileIndex === entry.fileIndex);
if (!f) {
  console.log("не найден в BIF");
  process.exit(1);
}

const data = bif.buffer.slice(f.offset, f.offset + f.size);
const text = data.toString("ascii");
console.log("\n=== ANIMATE.IDS ===");
console.log(text.slice(0, 4000));
const wolfEntries = key.entries.filter(
  (e) =>
    e.resref.toUpperCase().startsWith("WOLF") ||
    e.resref.toUpperCase().startsWith("BEAR") ||
    e.resref.toUpperCase() === "MAGE_M",
);
console.log(`\nНайдено ${wolfEntries.length} записей WOLF/BEAR/MAGE_M в KEY:`);
for (const e of wolfEntries.slice(0, 20)) {
  console.log(
    `  ${e.resref} type=0x${e.type.toString(16)} biff=${e.biffIndex} idx=${e.fileIndex}`,
  );
}