const path = require("path");
const fs = require("fs");
const { parseBiffFile } = require("../src/parsers/bif");

const GAME_DIR = process.env.GAME_DIR || "I:\\BG";
const biffPath = path.join(GAME_DIR, "data", "CREAnim.bif");

if (!fs.existsSync(biffPath)) {
  console.log(`Нет файла ${biffPath}`);
  console.log("Доступные BIF:");
  const files = fs
    .readdirSync(path.join(GAME_DIR, "data"))
    .filter((f) => f.toLowerCase().endsWith(".bif"));
  console.log(files.slice(0, 50).join("\n"));
  process.exit(1);
}

const biff = parseBiffFile(biffPath);
console.log(
  `CREAnim.bif: fileCount=${biff.fileCount}, tilesetCount=${biff.tilesetCount}`,
);

// Покажем первые 30 записей
console.log("Первые 30 файлов в CREAnim.bif:");
for (const f of biff.files.slice(0, 30)) {
  console.log(
    `  [${f.fileIndex}] type=0x${f.type.toString(16)} (${f.typeName}) size=${f.size}`,
  );
}
