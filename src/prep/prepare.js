// src/prep/prepare.js
// Преобразует BG1 WED + TIS + ARE в чанки WebP + meta.json

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const CHUNK_PX = 1024; // размер чанка в пикселях
const TILE_PX = 64;

/**
 * Подготавливает область: генерит meta.json и базовые чанки.
 *
 * wed     — результат parseWedFile
 * tis     — результат parseTisData (tiles с palette/pixels)
 * are     — результат parseAreFile
 * outDir  — куда писать (например, cache/AR2600)
 */
async function prepareArea(wed, tis, are, outDir) {
  fs.mkdirSync(path.join(outDir, "base"), { recursive: true });

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

  // 1. Декодируем все тайлы в RGBA буферы (по 64×64×4 байт)
  console.log(`[PREP] декодирование ${tis.tiles.length} тайлов...`);
  const tileRGBA = tis.tiles.map((t) => decodeTileToRGBA(t));

  // 2. Собираем каждый чанк
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      await buildBaseChunk(cx, cy, cols, rows, base, tileRGBA, W, H, outDir);
    }
  }

  // 3. meta.json
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
      wave: { present: false }, // заполним позже
      pool: { present: false },
    },
    builtAt: new Date().toISOString(),
  };

  // 4. Отдельно — информация об overlay-ячейках (пока просто список)
  const waveCells = [];
  const poolCells = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = base.tilemap[y * W + x];
      if (!t) continue;
      if (t.overlayFlags & 2) waveCells.push({ x, y, baseIdx: t.indices[0] });
      else if (t.overlayFlags & 4)
        poolCells.push({ x, y, baseIdx: t.indices[0] });
    }
  }
  meta.overlays.wave.present = waveCells.length > 0;
  meta.overlays.wave.cells = waveCells;
  meta.overlays.pool.present = poolCells.length > 0;
  meta.overlays.pool.cells = poolCells;

  fs.writeFileSync(path.join(outDir, "meta.json"), JSON.stringify(meta));
  console.log(`[PREP] готово: ${outDir}`);
}

/**
 * Декодирует BG1 тайл (palette BGRA + pixels 4096) в RGBA Uint8Array.
 * Возвращает Uint8ClampedArray 64×64×4.
 */
function decodeTileToRGBA(t) {
  const pal = t.palette; // Uint8Array, 256×3 = RGB
  const pix = t.pixels; // Uint8Array, 4096 индексов
  const out = new Uint8ClampedArray(TILE_PX * TILE_PX * 4);
  for (let i = 0; i < TILE_PX * TILE_PX; i++) {
    const idx = pix[i] * 3; // ← * 3, не * 4
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

/**
 * Собирает один базовый чанк (cx, cy) и сохраняет в WebP.
 */
async function buildBaseChunk(
  cx,
  cy,
  cols,
  rows,
  base,
  tileRGBA,
  W,
  H,
  outDir,
) {
  const px0 = cx * CHUNK_PX;
  const py0 = cy * CHUNK_PX;

  // Сколько пикселей реально в этом чанке (последний может быть меньше)
  const chunkW = Math.min(CHUNK_PX, base.width * TILE_PX - px0);
  const chunkH = Math.min(CHUNK_PX, base.height * TILE_PX - py0);

  // Создаём буфер чанка RGBA
  const buf = Buffer.alloc(chunkW * chunkH * 4, 0);

  // Сколько тайлов в чанке по X и Y
  const tilesX = Math.ceil(chunkW / TILE_PX);
  const tilesY = Math.ceil(chunkH / TILE_PX);

  const startTileX = Math.floor(px0 / TILE_PX);
  const startTileY = Math.floor(py0 / TILE_PX);

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const mapX = startTileX + tx;
      const mapY = startTileY + ty;
      if (mapX >= W || mapY >= H) continue;

      const cell = base.tilemap[mapY * W + mapX];
      if (!cell || !cell.indices.length) continue;
      const tileIdx = cell.indices[0];
      if (tileIdx >= tileRGBA.length) continue;

      // Куда рисовать в чанке
      const dstX = mapX * TILE_PX - px0;
      const dstY = mapY * TILE_PX - py0;
      const tile = tileRGBA[tileIdx];

      // Копируем пиксель-за-пикселем (можно оптимизировать)
      for (let y = 0; y < TILE_PX; y++) {
        const dstRow = (dstY + y) * chunkW * 4 + dstX * 4;
        const srcRow = y * TILE_PX * 4;
        tile.copy
          ? Buffer.from(
              tile.buffer,
              tile.byteOffset + srcRow,
              TILE_PX * 4,
            ).copy(buf, dstRow)
          : buf.set(tile.subarray(srcRow, srcRow + TILE_PX * 4), dstRow);
      }
    }
  }

  // Сохраняем в WebP
  const outPath = path.join(outDir, "base", `${cx}_${cy}.webp`);
  await sharp(buf, {
    raw: { width: chunkW, height: chunkH, channels: 4 },
  })
    .webp({ quality: 90, effort: 4 })
    .toFile(outPath);

  console.log(`  base/${cx}_${cy}.webp (${chunkW}×${chunkH})`);
}

module.exports = { prepareArea };
