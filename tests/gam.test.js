const fs = require("fs");
const path = require("path");
const { parseGamFile } = require("../src/parsers/gam");

const BG_DIR = process.env.BG_DIR || "I:\\BG\\Save\\000000001-Quick-Save";
const gam = parseGamFile(fs.readFileSync(path.join(BG_DIR, "BALDUR.GAM")));

console.log("=== GAM test ===");
console.log(`version:   ${gam.version}`);
console.log(`gameTime:  ${gam.gameTime} (час ${(gam.gameTime / 300) | 0})`);
console.log(`gold:      ${gam.partyGold}`);
console.log(`mainArea:  ${gam.mainArea}`);
console.log(`PC count:  ${gam.totalPartyNPCCount}`);

for (const pc of gam.partyMembers) {
  console.log(
    `  [${pc.partyOrder}] ${pc.characterName} @ ${pc.currentArea} (${pc.x},${pc.y})`,
  );
}

const asserts = [
  ["version V1.0 или V1.1", gam.version === "V1.0" || gam.version === "V1.1"],
  ["mainArea не пусто", !!gam.mainArea],
  ["partyGold >= 0", gam.partyGold >= 0],
  ["есть хотя бы 1 PC", gam.partyMembers.length > 0],
];
let ok = true;
for (const [label, cond] of asserts) {
  console.log(`${cond ? "✅" : "❌"} ${label}`);
  if (!cond) ok = false;
}
process.exit(ok ? 0 : 1);
