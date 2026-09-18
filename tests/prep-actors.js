const fs = require("fs");
const path = require("path");
const { GAME_DIR, SAVE_DIR, CACHE_DIR } = require("../src/server/version");
const { extractFileFromSave } = require("../src/parsers/sav");
const { parseAreFile } = require("../src/parsers/are");
const { prepareActors } = require("../src/prep/actors");

(async () => {
  const areaName = "AR2600";
  const outDir = path.join(CACHE_DIR, areaName);
  const areBuffer = extractFileFromSave(
    path.join(SAVE_DIR, "BALDUR.SAV"),
    `${areaName}.ARE`,
  );
  const are = parseAreFile(areBuffer);
  const actorsOut = path.join(outDir, "actors-preview");
  const actors = await prepareActors(areBuffer, are, actorsOut);
  fs.writeFileSync(path.join(outDir, "actors.json"), JSON.stringify(actors));
  console.log(
    `Готово: ${actors.length} акторов → ${path.join(outDir, "actors.json")}`,
  );
})();
