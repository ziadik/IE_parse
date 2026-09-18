const path = require("path");
const { parseKeyFile } = require("../src/parsers/key");

const GAME_DIR = process.env.GAME_DIR || "I:\\BG";
const key = parseKeyFile(path.join(GAME_DIR, "chitin.key"));

// Все уникальные BAM resref
const bams = key.entries.filter((x) => x.type === 0x03e8);

// Ищем по ключевым словам
const patterns = [
  "MAGE_M",
  "MAGE_F",
  "FIGHTER_M",
  "WOLF",
  "BEAR",
  "SKELE",
  "GOBLIN",
  "KOBOLD",
  "WYVERN",
  "DRAGON",
];
for (const p of patterns) {
  const found = bams.filter((b) => b.resref.toUpperCase().startsWith(p));
  console.log(`${p}: ${found.length} BAM`);
  for (const b of found.slice(0, 3)) {
    console.log(`  ${b.resref} (biff=${b.biffIndex}, idx=${b.fileIndex})`);
  }
}

// Покажем первые 30 BAM вообще
console.log("\nПервые 30 BAM:");
for (const b of bams.slice(0, 30)) {
  console.log(`  ${b.resref}`);
}
