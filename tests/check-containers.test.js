// tests/check-containers.test.js
const path = require("path");
const { SAVE_DIR } = require("../src/server/version");
const { extractFileFromSave } = require("../src/parsers/sav");
const { parseAreFile } = require("../src/parsers/are");

const areaName = "AR2600";
const areBuffer = extractFileFromSave(
  path.join(SAVE_DIR, "BALDUR.SAV"),
  `${areaName}.ARE`,
);
const are = parseAreFile(areBuffer);
console.log("ARE keys:", Object.keys(are));
console.log("stats:", are.stats);
