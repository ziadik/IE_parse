const fs = require("fs");
const path = require("path");
const { parseKeyFile } = require("../src/parsers/key");

const GAME_DIR = process.env.GAME_DIR || "I:\\BG";

// 1. Парсим avatars.2da
function parseAvatars2da(text) {
  const lines = text.split(/\r?\n/);
  const rows = [];
  let header = null;
  for (const line of lines) {
    if (!line.trim()) continue;
    if (line.startsWith("2DA")) continue;
    if (line.trim() === "*") continue;
    if (line.includes("AT_1")) {
      header = line.trim().split(/\s+/);
      continue;
    }
    const parts = line.trim().split(/\s+/);
    if (parts.length < 8) continue;
    const id = parseInt(parts[0], 16);
    if (isNaN(id)) continue;
    rows.push({
      id,
      at1: parts[1],
      at2: parts[2],
      at3: parts[3],
      at4: parts[4],
      type: parseInt(parts[5]),
      space: parseInt(parts[6]),
      palette: parts[7],
      size: parts[8] || "*",
    });
  }
  rows.sort((a, b) => a.id - b.id);
  return rows;
}

const text = fs.readFileSync(
  path.join(GAME_DIR, "2da", "avatars.2da"),
  "ascii",
);
const avatars = parseAvatars2da(text);
console.log(`Строк в avatars.2da: ${avatars.length}`);

// 2. Функция поиска по AnimationID
function findAvatar(animId) {
  animId &= 0xffff;
  let best = null;
  for (const r of avatars) {
    if (r.id <= animId) best = r;
    else break;
  }
  return best;
}

// 3. Тесты: ищем известные анимации
const tests = [
  { id: 0x6000, name: "Wolf?" },
  { id: 0x7400, name: "Dog?" },
  { id: 0x7200, name: "Bear?" },
  { id: 0x7f01, name: "Minotaur?" },
  { id: 0x6100, name: "Fighter?" },
];

for (const t of tests) {
  const r = findAvatar(t.id);
  if (!r) {
    console.log(`AnimID 0x${t.id.toString(16)} — не найден`);
    continue;
  }
  console.log(
    `AnimID 0x${t.id.toString(16)} (${t.name}) → row=0x${r.id.toString(16)} prefix=${r.at1} type=${r.type}`,
  );
}

// 4. Проверим, есть ли такие BAM в KEY
const key = parseKeyFile(path.join(GAME_DIR, "chitin.key"));
console.log("\n=== Поиск BAM в KEY ===");
for (const prefix of ["MBER", "MDOG", "MMIN", "CHMF1", "MWLF"]) {
  const bams = key.entries.filter(
    (e) => e.resref.toUpperCase().startsWith(prefix) && e.type === 0x03e8,
  );
  console.log(`${prefix}: ${bams.length} BAM`);
  for (const b of bams.slice(0, 10)) {
    console.log(`  ${b.resref} biff=${b.biffIndex} idx=${b.fileIndex}`);
  }
}
