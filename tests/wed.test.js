const path = require("path");
const { parseBiffFile, extractByType } = require("../src/parsers/bif");
const { parseWedFile } = require("../src/parsers/wed");

const BG_DIR = process.env.BG_DIR || "I:\\BG";
const biff = parseBiffFile(path.join(BG_DIR, "data", "AREA2600.bif"));
const wedData = extractByType(biff, 0x03e9)[0].data;

console.log("=== WED test ===");
console.log("hex 0x00..0x60:");
console.log(wedData.slice(0, 96).toString("hex").match(/.{32}/g).join("\n"));

const o = 0x20;
console.log("\noverlay[0] (raw 28 байт):");
console.log(wedData.slice(o, o + 28).toString("hex"));
for (let i = 0; i < 7; i++) {
  console.log(
    `  +0x${(i * 4).toString(16)}: ${wedData.readUInt32LE(o + i * 4)}`,
  );
}
// добавь в wed.test.js до parseWedFile
const w = wedData;
console.log("hex @0x148 :", w.slice(0x148, 0x148 + 64).toString("hex"));
console.log("hex @0xbd10:", w.slice(0xbd10, 0xbd10 + 64).toString("hex"));
console.log("hex @0xbd10+48000:", w.slice(0xbd10 + 48000, 0xbd10 + 48000 + 64).toString("hex"));
console.log("\noverlay[0] через parseWedFile:");
const wed = parseWedFile(wedData);
const base = wed.overlays[0];
console.log(
  `  tilemapOffset=0x${base.tilemapOffset.toString(16)}  (${base.tilemapOffset})`,
);
console.log(
  `  tilOffset=0x${base.tilOffset.toString(16)}  (${base.tilOffset})`,
);
console.log(`  uniqueTileCount=${base.uniqueTileCount}`);
console.log(`  movementType=${base.movementType}`);

// --- ГИПОТЕЗЫ для реального tilemap offset ---
console.log("\n--- Поиск настоящего tilemap ---");
const candidates = [0x38, 0x3c, 0x40, 0x148, 0x14c, 0x150];
for (const c of candidates) {
  const s0 = wedData.readUInt16LE(c);
  const c0 = wedData.readUInt16LE(c + 2);
  const s1 = wedData.readUInt16LE(c + 10);
  const s2 = wedData.readUInt16LE(c + 20);
  console.log(
    `  @0x${c.toString(16)}: start0=${s0} count0=${c0}  start1=${s1}  start2=${s2}  hex=${wedData.slice(c, c + 16).toString("hex")}`,
  );
}

// --- Что по offset 0x148? ---
console.log("\nhex @0x148:", wedData.slice(0x148, 0x148 + 64).toString("hex"));
console.log("hex @0x38 :", wedData.slice(0x38, 0x38 + 64).toString("hex"));
console.log("hex @0x14c:", wedData.slice(0x14c, 0x14c + 64).toString("hex"));
