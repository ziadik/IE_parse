const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { decodeTileToRGBA } = require("./tiles");

async function prepareDoorTiles(wed, tis, outDir) {
  const tilesDir = path.join(outDir, "door-tiles");
  fs.mkdirSync(tilesDir, { recursive: true });

  const base = wed.overlays[0];
  const tileRGBA = tis.tiles.map(decodeTileToRGBA);

  // Собираем все уникальные secondaryTileIndex
  const indices = new Set();
  for (const cell of base.tilemap) {
    if (
      cell.secondaryTileIndex !== 0xffff &&
      cell.secondaryTileIndex !== 65535
    ) {
      indices.add(cell.secondaryTileIndex);
    }
  }

  console.log(`[PREP] door-tiles: ${indices.size} уникальных`);

  const meta = {};
  for (const idx of indices) {
    const tile = tileRGBA[idx];
    if (!tile) continue;
    const png = await sharp(Buffer.from(tile), {
      raw: { width: 64, height: 64, channels: 4 },
    })
      .png()
      .toBuffer();
    fs.writeFileSync(path.join(tilesDir, `${idx}.png`), png);
    meta[idx] = `door-tiles/${idx}.png`;
  }

  fs.writeFileSync(path.join(outDir, "door-tiles.json"), JSON.stringify(meta));
  return meta;
}

module.exports = { prepareDoorTiles };
