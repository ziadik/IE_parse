const path = require("path");
const { parseKeyFile } = require("../src/parsers/key");

const BG_DIR = process.env.BG_DIR || "I:\\BG";
const key = parseKeyFile(path.join(BG_DIR, "chitin.key"));

console.log("=== KEY test ===");
console.log(`biffCount: ${key.biffs.length}`);
console.log(`keyCount:  ${key.entries.length}`);
console.log(`BIF[0]: ${key.biffs[0].name}`);
console.log(`BIF[1]: ${key.biffs[1].name}`);

const e = key.entries.find(
  (x) => x.resref.toUpperCase() === "AR2600" && x.type === 0x03eb,
);
if (e) {
  console.log(
    `AR2600.TIS: biffIndex=${e.biffIndex} name=${key.biffs[e.biffIndex].name} tilesetIndex=${e.tilesetIndex} fileIndex=${e.fileIndex}`,
  );
} else {
  console.log("AR2600.TIS НЕ найден");
}

// проверки
const asserts = [
  ["biffs > 0", key.biffs.length > 0],
  ["entries > 0", key.entries.length > 0],
  ["BIF[1] — не пустое", key.biffs[1] && key.biffs[1].name.length > 0],
  ["AR2600.TIS найден", !!e],
];
let ok = true;
for (const [label, cond] of asserts) {
  console.log(`${cond ? "✅" : "❌"} ${label}`);
  if (!cond) ok = false;
}
process.exit(ok ? 0 : 1);
