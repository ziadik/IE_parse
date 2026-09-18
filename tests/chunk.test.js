// tests/chunk.test.js
const path = require("path");
const { parseBiffFile, extractByType } = require("../src/parsers/bif");
const { parseWedFile } = require("../src/parsers/wed");
const { parseTisData } = require("../src/parsers/tis");
const sharp = require("sharp");

const GAME_DIR = process.env.GAME_DIR || "I:\\BG";
const biff = parseBiffFile(path.join(GAME_DIR, "data", "AREA2600.bif"));
const wed = parseWedFile(extractByType(biff, 0x03e9)[0].data);
const ts = biff.tilesets[0];
const tis = parseTisData(biff.buffer, ts.offset, ts.tileCount, ts.tileSize);

const TILE = 64;
function decodeTileToRGBA(t) {
  const pal = t.palette; // Uint8Array, 256×3 = RGB
  const pix = t.pixels; // Uint8Array, 4096 индексов
  const out = new Uint8ClampedArray(TILE * TILE * 4);
  for (let i = 0; i < TILE * TILE; i++) {
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

// Один тайл → PNG
const t0 = decodeTileToRGBA(tis.tiles[0]);
sharp(Buffer.from(t0), { raw: { width: TILE, height: TILE, channels: 4 } })
  .png()
  .toFile("debug-tile0.png")
  .then(() => console.log("✅ debug-tile0.png"));

// Чанк 0_0 → PNG
const base = wed.overlays[0];
const chunkW = 1024,
  chunkH = 1024;
const buf = Buffer.alloc(chunkW * chunkH * 4);
const tilesX = Math.ceil(chunkW / TILE);
const tilesY = Math.ceil(chunkH / TILE);
const tileRGBA = tis.tiles.map(decodeTileToRGBA);

for (let ty = 0; ty < tilesY; ty++) {
  for (let tx = 0; tx < tilesX; tx++) {
    const mapX = tx,
      mapY = ty;
    const cell = base.tilemap[mapY * base.width + mapX];
    if (!cell || !cell.indices.length) continue;
    const tile = tileRGBA[cell.indices[0]];
    const dstX = mapX * TILE,
      dstY = mapY * TILE;
    for (let y = 0; y < TILE; y++) {
      const dstRowStart = ((dstY + y) * chunkW + dstX) * 4;
      const srcRowStart = y * TILE * 4;
      for (let i = 0; i < TILE * 4; i++) {
        buf[dstRowStart + i] = tile[srcRowStart + i];
      }
    }
  }
}

sharp(buf, { raw: { width: chunkW, height: chunkH, channels: 4 } })
  .png()
  .toFile("debug-chunk-0-0.png")
  .then(() => console.log("✅ debug-chunk-0-0.png"));
