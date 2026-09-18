const path = require("path");
const sharp = require("sharp");
const { TILE_PX } = require("./tiles");
const CHUNK_PX = 1024;

async function buildBaseChunks({ base, tileRGBA, W, H, cols, rows, outDir }) {
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      await buildBaseChunk(cx, cy, base, tileRGBA, W, H, outDir);
    }
  }
}

async function buildBaseChunk(cx, cy, base, tileRGBA, W, H, outDir) {
  const px0 = cx * CHUNK_PX,
    py0 = cy * CHUNK_PX;
  const chunkW = Math.min(CHUNK_PX, W * TILE_PX - px0);
  const chunkH = Math.min(CHUNK_PX, H * TILE_PX - py0);
  const buf = Buffer.alloc(chunkW * chunkH * 4, 0);

  const startTileX = Math.floor(px0 / TILE_PX);
  const startTileY = Math.floor(py0 / TILE_PX);
  const tilesX = Math.ceil(chunkW / TILE_PX);
  const tilesY = Math.ceil(chunkH / TILE_PX);

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const mapX = startTileX + tx,
        mapY = startTileY + ty;
      if (mapX >= W || mapY >= H) continue;
      const cell = base.tilemap[mapY * W + mapX];
      if (!cell || !cell.indices.length) continue;
      const tileIdx = cell.indices[0];
      if (tileIdx >= tileRGBA.length) continue;
      const dstX = mapX * TILE_PX - px0,
        dstY = mapY * TILE_PX - py0;
      const tile = tileRGBA[tileIdx];
      for (let y = 0; y < TILE_PX; y++) {
        const dstRowStart = ((dstY + y) * chunkW + dstX) * 4;
        const srcRowStart = y * TILE_PX * 4;
        for (let i = 0; i < TILE_PX * 4; i++) {
          buf[dstRowStart + i] = tile[srcRowStart + i];
        }
      }
    }
  }

  const outPath = path.join(outDir, "base", `${cx}_${cy}.webp`);
  await sharp(buf, { raw: { width: chunkW, height: chunkH, channels: 4 } })
    .webp({ quality: 90, effort: 4 })
    .toFile(outPath);
  console.log(`  base/${cx}_${cy}.webp`);
}

module.exports = { buildBaseChunks, CHUNK_PX };
