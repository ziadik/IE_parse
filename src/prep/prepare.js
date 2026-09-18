const fs = require("fs");
const path = require("path");
const { buildBaseChunks } = require("./chunk");
const { buildOverlayChunks } = require("./overlay");

async function prepareArea({ wed, tis, are, wtwave, wtpool, outDir }) {
  fs.mkdirSync(path.join(outDir, "base"), { recursive: true });
  fs.mkdirSync(path.join(outDir, "overlay"), { recursive: true });

  const base = wed.overlays[0];
  const W = base.width,
    H = base.height;
  const MAP_W = W * 64,
    MAP_H = H * 64;
  const cols = Math.ceil(MAP_W / 1024);
  const rows = Math.ceil(MAP_H / 1024);

  console.log(`[PREP] ${W}×${H} тайлов, ${cols}×${rows} чанков`);

  const tileRGBA = tis.tiles.map(require("./tiles").decodeTileToRGBA);

  // Base
  await buildBaseChunks({ base, tileRGBA, W, H, cols, rows, outDir });

  // Overlay
  const { waveChunks, poolChunks } = await buildOverlayChunks({
    base,
    tileRGBA,
    W,
    H,
    cols,
    rows,
    outDir,
    wtwaveTiles: wtwave.tiles,
    wtpoolTiles: wtpool.tiles,
  });

  // meta.json
  const meta = {
    area: path.basename(outDir),
    width: W,
    height: H,
    mapWidth: MAP_W,
    mapHeight: MAP_H,
    tileSize: 64,
    chunkSize: 1024,
    chunkCols: cols,
    chunkRows: rows,
    tilesetName: base.tilesetName,
    doors: are.doors,
    actors: are.actors,
    vertices: are.vertices,
    overlays: {
      wave: { present: waveChunks.length > 0, frames: 6, chunks: waveChunks },
      pool: { present: poolChunks.length > 0, frames: 6, chunks: poolChunks },
    },
    builtAt: new Date().toISOString(),
  };

  fs.writeFileSync(path.join(outDir, "meta.json"), JSON.stringify(meta));
  console.log(`[PREP] готово: ${outDir}`);
}

module.exports = { prepareArea };
