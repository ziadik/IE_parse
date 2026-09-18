const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const CHUNK_PX = 1024;
const TILE_PX = 64;
const FRAMES = 6;

async function prepareArea(wed, tis, are, outDir, wtwaveTiles, wtpoolTiles) {
  fs.mkdirSync(path.join(outDir, "base"), { recursive: true });
  fs.mkdirSync(path.join(outDir, "overlay"), { recursive: true });

  const base = wed.overlays[0];
  const W = base.width;
  const H = base.height;
  const MAP_W = W * TILE_PX;
  const MAP_H = H * TILE_PX;
  const cols = Math.ceil(MAP_W / CHUNK_PX);
  const rows = Math.ceil(MAP_H / CHUNK_PX);

  console.log(
    `[PREP] ${W}×${H} тайлов, ${MAP_W}×${MAP_H} px, чанки: ${cols}×${rows}`,
  );

  // Декодируем все тайлы
  console.log(`[PREP] декодирование ${tis.tiles.length} тайлов...`);
  const tileRGBA = tis.tiles.map(decodeTileToRGBA);

  // Base чанки
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      await buildBaseChunk(cx, cy, base, tileRGBA, W, H, outDir);
    }
  }

  // Overlay чанки
  console.log(`[PREP] overlay chunks...`);
  const waveChunks = [];
  const poolChunks = [];

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

  // meta.json
  const meta = {
    area: path.basename(outDir),
    width: W,
    height: H,
    mapWidth: MAP_W,
    mapHeight: MAP_H,
    tileSize: TILE_PX,
    tilesetName: base.tilesetName,
    chunkSize: CHUNK_PX,
    chunkCols: cols,
    chunkRows: rows,
    doors: are.doors,
    actors: are.actors,
    vertices: are.vertices,
    overlays: {
      wave: {
        present: waveChunks.length > 0,
        frames: FRAMES,
        chunks: waveChunks,
      },
      pool: {
        present: poolChunks.length > 0,
        frames: FRAMES,
        chunks: poolChunks,
      },
    },
    builtAt: new Date().toISOString(),
  };

  fs.writeFileSync(path.join(outDir, "meta.json"), JSON.stringify(meta));
  console.log(`[PREP] готово: ${outDir}`);
  console.log(`  base chunks: ${cols * rows}`);
  console.log(`  wave chunks: ${waveChunks.length}`);
  console.log(`  pool chunks: ${poolChunks.length}`);
}

function decodeTileToRGBA(t) {
  const pal = t.palette;
  const pix = t.pixels;
  const out = new Uint8ClampedArray(TILE_PX * TILE_PX * 4);
  for (let i = 0; i < TILE_PX * TILE_PX; i++) {
    const idx = pix[i] * 3;
    const r = pal[idx],
      g = pal[idx + 1],
      b = pal[idx + 2];
    if (r === 0 && g === 255 && b === 0) {
      out[i * 4 + 3] = 0;
    } else {
      out[i * 4 + 0] = r;
      out[i * 4 + 1] = g;
      out[i * 4 + 2] = b;
      out[i * 4 + 3] = 255;
    }
  }
  return out;
}

async function buildBaseChunk(cx, cy, base, tileRGBA, W, H, outDir) {
  const px0 = cx * CHUNK_PX;
  const py0 = cy * CHUNK_PX;
  const chunkW = Math.min(CHUNK_PX, base.width * TILE_PX - px0);
  const chunkH = Math.min(CHUNK_PX, base.height * TILE_PX - py0);

  const buf = Buffer.alloc(chunkW * chunkH * 4, 0);

  const startTileX = Math.floor(px0 / TILE_PX);
  const startTileY = Math.floor(py0 / TILE_PX);
  const tilesX = Math.ceil(chunkW / TILE_PX);
  const tilesY = Math.ceil(chunkH / TILE_PX);

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const mapX = startTileX + tx;
      const mapY = startTileY + ty;
      if (mapX >= W || mapY >= H) continue;

      const cell = base.tilemap[mapY * W + mapX];
      if (!cell || !cell.indices.length) continue;
      const tileIdx = cell.indices[0];
      if (tileIdx >= tileRGBA.length) continue;

      const dstX = mapX * TILE_PX - px0;
      const dstY = mapY * TILE_PX - py0;
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

  console.log(`  base/${cx}_${cy}.webp (${chunkW}×${chunkH})`);
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
  const px0 = cx * CHUNK_PX;
  const py0 = cy * CHUNK_PX;
  const chunkW = Math.min(CHUNK_PX, base.width * TILE_PX - px0);
  const chunkH = Math.min(CHUNK_PX, base.height * TILE_PX - py0);

  const totalW = FRAMES * chunkW;
  const sheet = Buffer.alloc(totalW * chunkH * 4, 0);

  let anyCell = false;

  const startTileX = Math.floor(px0 / TILE_PX);
  const startTileY = Math.floor(py0 / TILE_PX);
  const tilesX = Math.ceil(chunkW / TILE_PX);
  const tilesY = Math.ceil(chunkH / TILE_PX);

  const overlayRGBA = overlayTiles.map(decodeTileToRGBA);

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const mapX = startTileX + tx;
      const mapY = startTileY + ty;
      if (mapX >= W || mapY >= H) continue;

      const cell = base.tilemap[mapY * W + mapX];
      if (!cell) continue;
      const isWave = !!(cell.overlayFlags & 2);
      const isPool = !!(cell.overlayFlags & 4);
      if (kind === "wave" && !isWave) continue;
      if (kind === "pool" && !isPool) continue;

      anyCell = true;

      const baseTile = tileRGBA[cell.indices[0]];
      const dstX = mapX * TILE_PX - px0;
      const dstY = mapY * TILE_PX - py0;

      for (let f = 0; f < FRAMES; f++) {
        const overlay = overlayRGBA[f % overlayRGBA.length];
        const frameX = f * chunkW + dstX;

        for (let y = 0; y < TILE_PX; y++) {
          const dstRowStart = ((dstY + y) * totalW + frameX) * 4;
          const srcRowStart = y * TILE_PX * 4;
          for (let i = 0; i < TILE_PX * 4; i += 4) {
            const a = baseTile[srcRowStart + i + 3];
            if (a === 0) {
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

module.exports = { prepareArea };
