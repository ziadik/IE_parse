// tests/wed-doors.test.js
const path = require("path");
const { parseBiffFile, extractByType } = require("../src/parsers/bif");

const GAME_DIR = process.env.GAME_DIR || "I:\\BG";
const biff = parseBiffFile(path.join(GAME_DIR, "data", "AREA2600.bif"));
const wedData = extractByType(biff, 0x03e9)[0].data;

const offsetToDoors = wedData.readUInt32LE(0x18);
const doorCount = wedData.readUInt32LE(0x0c);
console.log(
  `offsetToDoors=0x${offsetToDoors.toString(16)} doorCount=${doorCount}`,
);

// hex первых 4 дверей
for (let i = 0; i < Math.min(4, doorCount); i++) {
  const o = offsetToDoors + i * 0x1a;
  console.log(`  [${i}] hex=${wedData.slice(o, o + 32).toString("hex")}`);
  console.log(`        ascii="${wedData.slice(o, o + 8).toString("ascii")}"`);
}
