// tests/door-bams.test.js
const path = require("path");
const { parseBiffFile, extractByType } = require("../src/parsers/bif");

const GAME_DIR = process.env.GAME_DIR || "I:\\BG";
const biff = parseBiffFile(path.join(GAME_DIR, "data", "AREA2600.bif"));
const bams = extractByType(biff, 0x03e8);

console.log(`BAM в AREA2600.bif: ${bams.length}`);
for (const b of bams) {
  console.log(`  [${b.fileIndex}] size=${b.size}`);
}
