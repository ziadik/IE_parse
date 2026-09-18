const path = require("path");
const sharp = require("sharp");
const { decodeTileToRGBA, TILE_PX } = require("./tiles");
const { CHUNK_PX } = require("./chunk");
const FRAMES = 6;

async function buildOverlayChunks({
  base,
  tileRGBA,
  W,
  H,
  cols,
  rows,
  outDir,
  wtwaveTiles,
  wtpoolTiles,
}) {
  const waveChunks = [],
    poolChunks = [];

  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      await buildOverlayChunk(
        "wave",
        cx,
        cy,
        base,
        tileRGBA,
        W,
        H,
        outDir,
        wtwaveTiles,
        waveChunks,
      );
      await buildOverlayChunk(
        "pool",
        cx,
        cy,
        base,
        tileRGBA,
        W,
        H,
        outDir,
        wtpoolTiles,
        poolChunks,
      );
    }
  }

  return { waveChunks, poolChunks };
}

async function buildOverlayChunk(
  kind,
  cx,
  cy,
  base,
  tileRGBA,
  W,
  H,
  outDir,
  overlayTiles,
  outChunks,
) {
  const px0 = cx * CHUNK_PX,
    py0 = cy * CHUNK_PX;
  const chunkW = Math.min(CHUNK_PX, W * TILE_PX - px0);
  const chunkH = Math.min(CHUNK_PX, H * TILE_PX - py0);
  const totalW = FRAMES * chunkW;
  const sheet = Buffer.alloc(totalW * chunkH * 4, 0);

  const overlayRGBA = overlayTiles.map(decodeTileToRGBA);
  const startTileX = Math.floor(px0 / TILE_PX),
    startTileY = Math.floor(py0 / TILE_PX);
  const tilesX = Math.ceil(chunkW / TILE_PX),
    tilesY = Math.ceil(chunkH / TILE_PX);
  let anyCell = false;

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const mapX = startTileX + tx,
        mapY = startTileY + ty;
      if (mapX >= W || mapY >= H) continue;
      const cell = base.tilemap[mapY * W + mapX];
      if (!cell) continue;
      if (kind === "wave" && !(cell.overlayFlags & 2)) continue;
      if (kind === "pool" && !(cell.overlayFlags & 4)) continue;

      anyCell = true;
      const baseTile = tileRGBA[cell.indices[0]];
      const dstX = mapX * TILE_PX - px0,
        dstY = mapY * TILE_PX - py0;

      for (let f = 0; f < FRAMES; f++) {
        const overlay = overlayRGBA[f % overlayRGBA.length];
        const frameX = f * chunkW + dstX;
        for (let y = 0; y < TILE_PX; y++) {
          const dstRowStart = ((dstY + y) * totalW + frameX) * 4;
          const srcRowStart = y * TILE_PX * 4;
          for (let i = 0; i < TILE_PX * 4; i += 4) {
            if (baseTile[srcRowStart + i + 3] === 0) {
              sheet[dstRowStart + i + 0] = overlay[srcRowStart + i + 0];
              sheet[dstRowStart + i + 1] = overlay[srcRowStart + i + 1];
              sheet[dstRowStart + i + 2] = overlay[srcRowStart + i + 2];
              sheet[dstRowStart + i + 3] = 255;
            }
          }
        }
      }
    }
  }

  if (!anyCell) return;

  const outPath = path.join(outDir, "overlay", `${kind}_${cx}_${cy}.webp`);
  await sharp(sheet, { raw: { width: totalW, height: chunkH, channels: 4 } })
    .webp({ quality: 90, effort: 4 })
    .toFile(outPath);
  outChunks.push(`${cx}_${cy}`);
  console.log(`  overlay/${kind}_${cx}_${cy}.webp`);
}

module.exports = { buildOverlayChunks };
