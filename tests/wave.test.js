const path = require("path");
const { parseKeyFile } = require("../src/parsers/key");
const { parseBiffFile } = require("../src/parsers/bif");
const { parseTisData } = require("../src/parsers/tis");

const GAME_DIR = process.env.GAME_DIR || "I:\\BG";
const key = parseKeyFile(path.join(GAME_DIR, "chitin.key"));

for (const name of ["WTWAVE", "WTPOOL"]) {
  const e = key.entries.find(
    (x) => x.resref.toUpperCase() === name && x.type === 0x03eb,
  );
  if (!e) {
    console.log(`${name}.TIS НЕ найден`);
    continue;
  }
  const bifName = key.biffs[e.biffIndex].name;
  console.log(
    `${name}.TIS → biffIndex=${e.biffIndex} (${bifName}) tilesetIndex=${e.tilesetIndex}`,
  );

  const biff = parseBiffFile(path.join(GAME_DIR, bifName));
  const ts = biff.tilesets.find((t) => t.idx === e.tilesetIndex);
  if (!ts) {
    console.log("  tileset не найден в BIF");
    continue;
  }
  console.log(
    `  ts.offset=${ts.offset} count=${ts.tileCount} tileSize=${ts.tileSize}`,
  );
  const tis = parseTisData(biff.buffer, ts.offset, ts.tileCount, ts.tileSize);
  console.log(`  спарсено тайлов: ${tis.tiles.length}`);
  // первый тайл — палитра
  const t = tis.tiles[0];
  console.log(`  tile[0] palette: ${t.palette.slice(0, 12).join(",")}`);
}
