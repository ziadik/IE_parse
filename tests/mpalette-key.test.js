// tests/mpalette-key.test.js
const path = require("path");
const { parseKeyFile } = require("../src/parsers/key");
const { parseBiffFile } = require("../src/parsers/bif");

const GAME_DIR = process.env.GAME_DIR || "I:\\BG";
const key = parseKeyFile(path.join(GAME_DIR, "chitin.key"));

for (const name of ["MPALETTE", "MPAL256", "MPALST01", "PAL32", "PAL16"]) {
  const all = key.entries.filter((x) => x.resref.toUpperCase() === name);
  console.log(`\n=== ${name} (${all.length} записей) ===`);
  for (const e of all) {
    const biffName = key.biffs[e.biffIndex].name;
    console.log(
      `  type=0x${e.type.toString(16)} biff=${e.biffIndex} (${biffName}) idx=${e.fileIndex}`,
    );

    const biff = parseBiffFile(path.join(GAME_DIR, biffName));
    const f = biff.files.find((x) => x.fileIndex === e.fileIndex);
    if (!f) continue;
    const buf = biff.buffer.slice(f.offset, f.offset + f.size);

    // Проверим BMP
    if (buf.toString("ascii", 0, 2) === "BM") {
      const w = buf.readInt32LE(0x12);
      const h = buf.readInt32LE(0x16);
      const bpp = buf.readUInt16LE(0x1c);
      console.log(`    BM ${w}×${h} bpp=${bpp} size=${f.size}`);
    } else {
      console.log(`    не BMP, hex: ${buf.slice(0, 8).toString("hex")}`);
    }
  }
}
