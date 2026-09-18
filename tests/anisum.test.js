const path = require("path");
const fs = require("fs");
const { parseKeyFile } = require("../src/parsers/key");
const { parseBiffFile } = require("../src/parsers/bif");

const GAME_DIR = process.env.GAME_DIR || "I:\\BG";
const key = parseKeyFile(path.join(GAME_DIR, "chitin.key"));

for (const resref of ["ANISUM01", "ANISUM02", "ANISUM03"]) {
  const e = key.entries.find(
    (x) => x.resref.toUpperCase() === resref && x.type === 0x03fd,
  );
  if (!e) {
    console.log(`${resref}.2DA НЕ найден`);
    continue;
  }
  console.log(
    `\n=== ${resref}.2DA (biff=${e.biffIndex}, fileIdx=${e.fileIndex}) ===`,
  );

  const bif = parseBiffFile(path.join(GAME_DIR, key.biffs[e.biffIndex].name));
  const f = bif.files.find((x) => x.fileIndex === e.fileIndex);
  if (!f) {
    console.log("  не найден в BIF");
    continue;
  }

  const data = bif.buffer.slice(f.offset, f.offset + f.size);
  const text = data.toString("ascii");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  console.log(`  строк: ${lines.length}`);
  // покажем 40 строк
  for (const l of lines.slice(0, 40)) console.log("  " + l);
}
