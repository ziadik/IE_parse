// tests/door-key.test.js
const path = require("path");
const { parseKeyFile } = require("../src/parsers/key");

const GAME_DIR = process.env.GAME_DIR || "I:\\BG";
const key = parseKeyFile(path.join(GAME_DIR, "chitin.key"));

// Все BAM с DOOR в имени
const doors = key.entries.filter(
  (e) => e.resref.toUpperCase().startsWith("DOOR") && e.type === 0x03e8,
);
console.log(`BAM DOOR*: ${doors.length}`);
for (const d of doors.slice(0, 30)) {
  console.log(`  ${d.resref} biff=${d.biffIndex} idx=${d.fileIndex}`);
}
