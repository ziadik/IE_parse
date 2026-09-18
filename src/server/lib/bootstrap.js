const fs = require("fs");
const path = require("path");
const { getBiff, getKey, findTisEntry, areaBifName } = require("./cache");
const { GAME_DIR, SAVE_DIR, CACHE_DIR } = require("../version");
const { parseWedFile } = require("../../parsers/wed");
const { parseTisData } = require("../../parsers/tis");
const { parseAreFile } = require("../../parsers/are");
const { extractFileFromSave } = require("../../parsers/sav");
const { extractByType } = require("../../parsers/bif");
const { prepareArea } = require("../../prep/prepare");
const { prepareActors } = require("../../prep/actors");

async function loadTisByName(resref) {
  const e = findTisEntry(resref);
  if (!e) throw new Error(`${resref}.TIS не найден`);
  const key = getKey();
  const bif = getBiff(path.join(GAME_DIR, key.biffs[e.biffIndex].name));
  const ts = bif.tilesets.find((t) => t.idx === e.tilesetIndex);
  return parseTisData(bif.buffer, ts.offset, ts.tileCount, ts.tileSize);
}

async function bootstrapPrepare() {
  const areaName = "AR2600";
  const outDir = path.join(CACHE_DIR, areaName);

  const metaExists = fs.existsSync(path.join(outDir, "meta.json"));
  const actorsExists = fs.existsSync(path.join(outDir, "actors.json"));

  if (metaExists && actorsExists) {
    console.log(`[CACHE] ${areaName} уже подготовлен`);
    return;
  }

  console.log(`[PREP] подготовка ${areaName}...`);
  const t0 = Date.now();

  // WED
  const biff = getBiff(path.join(GAME_DIR, "data", areaBifName(areaName)));
  const wed = parseWedFile(extractByType(biff, 0x03e9)[0].data);

  // TIS base
  const tis = await loadTisByName(areaName);

  // ARE (один раз!)
  const areBuffer = extractFileFromSave(
    path.join(SAVE_DIR, "BALDUR.SAV"),
    `${areaName}.ARE`,
  );
  const are = parseAreFile(areBuffer);

  // Overlay TIS
  const wtwave = await loadTisByName("WTWAVE");
  const wtpool = await loadTisByName("WTPOOL");

  await prepareArea({ wed, tis, are, wtwave, wtpool, outDir });

  try {
    const actorsOut = path.join(outDir, "actors-preview");
    const actors = await prepareActors(areBuffer, are, actorsOut);
    fs.writeFileSync(path.join(outDir, "actors.json"), JSON.stringify(actors));
    console.log(`[PREP] actors: ${actors.length}`);
  } catch (e) {
    console.error(`[PREP] actors failed: ${e.message}`);
    // Заглушка, чтобы не пересобирать вечно
    fs.writeFileSync(path.join(outDir, "actors.json"), JSON.stringify([]));
  }

  console.log(
    `[PREP] ${areaName} готов за ${((Date.now() - t0) / 1000).toFixed(1)} c`,
  );
}

module.exports = { bootstrapPrepare, loadTisByName };
