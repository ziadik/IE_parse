const path = require("path");
const { extractFileFromSave } = require("../src/parsers/sav");
const { parseAreFile } = require("../src/parsers/are");

const BG_DIR = process.env.BG_DIR || "I:\\BG";
const savePath = path.join("I:\\BG\\Save\\000000001-Quick-Save", "BALDUR.SAV");
const areData = extractFileFromSave(savePath, "AR2600.ARE");
const are = parseAreFile(areData);

console.log("=== ARE test ===");
console.log(`version: ${are.version}`);
console.log(`WED:     ${are.wedResref}`);
console.log(`flags:   0x${are.areaFlags.toString(16)}`);
console.log(`stats:   ${JSON.stringify(are.stats)}`);

console.log("\nПервые 5 акторов:");
for (const a of are.actors.slice(0, 5)) {
  console.log(`  ${a.name} @ (${a.x},${a.y}) cre=${a.creFile}`);
}

console.log("\nДвери:");
for (const d of are.doors) {
  console.log(
    `  ${d.name} id=${d.doorId} open=${d.isOpen} locked=${d.isLocked}`,
  );
}

const asserts = [
  ["version == V1.0", are.version === "V1.0"],
  ["wedResref == AR2600", are.wedResref === "AR2600"],
  ["actors > 30", are.stats.actors > 30],
  ["doors == 6", are.stats.doors === 6],
  ["vertices > 100", are.stats.vertices > 100],
];
let ok = true;
for (const [label, cond] of asserts) {
  console.log(`${cond ? "✅" : "❌"} ${label}`);
  if (!cond) ok = false;
}
process.exit(ok ? 0 : 1);
