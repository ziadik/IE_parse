const path = require("path");
const { listSaveFiles, extractFileFromSave } = require("../src/parsers/sav");

const BG_DIR = process.env.BG_DIR || "I:\\BG\\Save\\000000001-Quick-Save";
const savePath = path.join(BG_DIR, "BALDUR.SAV");

console.log("=== SAV test ===");
const files = listSaveFiles(savePath);
console.log(`Файлов в SAV: ${files.length}`);
for (const f of files) {
  console.log(`  ${f.name}: ${f.compressedSize} -> ${f.uncompressedSize}`);
}

let ok = true;
if (files.length === 0) {
  console.log("❌ SAV пуст");
  ok = false;
}

// Извлечём AR2600.ARE
try {
  const are = extractFileFromSave(savePath, "AR2600.ARE");
  console.log(`AR2600.ARE распакован: ${are.length} байт`);
  console.log(`сигнатура: ${are.toString("ascii", 0, 8)}`);
  if (!are.toString("ascii", 0, 4).startsWith("AREA")) {
    console.log("❌ ARE сигнатура неверна");
    ok = false;
  } else {
    console.log("✅ ARE сигнатура");
  }
} catch (e) {
  console.log(`❌ ${e.message}`);
  ok = false;
}
process.exit(ok ? 0 : 1);
