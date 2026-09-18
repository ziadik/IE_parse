const fs = require("fs");
const path = require("path");
const { extractFileFromSave } = require("../src/parsers/sav");
const { parseAreFile } = require("../src/parsers/are");
const { parseCreHeader } = require("../src/parsers/cre");
const { prepareActors } = require("../src/prep/actors");

const GAME_DIR = process.env.GAME_DIR || "I:\\BG";
const SAVE_DIR = process.env.SAVE_DIR || "I:\\BG\\Save\\000000001-Quick-Save";

(async () => {
  const areBuf = extractFileFromSave(
    path.join(SAVE_DIR, "BALDUR.SAV"),
    "AR2600.ARE",
  );
  const are = parseAreFile(areBuf);
  console.log(`Акторов: ${are.actors.length}`);

  // Показать первых 10
  for (let i = 0; i < Math.min(10, are.actors.length); i++) {
    const a = are.actors[i];
    try {
      const cre = parseCreHeader(areBuf, a.creOffset);
      console.log(
        `[${i}] ${a.name} @ (${a.x},${a.y}) animID=0x${cre.animationID.toString(16)} v${cre.version}`,
      );
    } catch (e) {
      console.log(`[${i}] ошибка: ${e.message}`);
    }
  }

  // Сгенерим PNG для всех
  const outDir = path.join(
    __dirname,
    "..",
    "cache",
    "AR2600",
    "actors-preview",
  );
  const enriched = await prepareActors(areBuf, are, outDir);
  console.log(`\nГотово. Примеры:\n`, enriched.slice(0, 5));
})();
