const TILE_PX = 64;

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

module.exports = { decodeTileToRGBA, TILE_PX };
