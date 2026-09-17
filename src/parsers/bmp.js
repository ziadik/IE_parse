/**
 * BMP (BITMAPFILEHEADER + BITMAPINFOHEADER):
 *   0x00 "BM"
 *   0x0a dword offsetToPixels
 *   0x0e dword headerSize (>= 40)
 *   0x12 dword width
 *   0x16 dword height
 *   0x1c word  bpp
 *   0x1e dword compression (0)
 * Палитра: 2^bpp × BGRA (A=0 → 255)
 * Пиксели: снизу вверх, строки выровнены до 4 байт.
 */
function parseBmp(buffer) {
  const sig = buffer.toString("ascii", 0, 2);
  if (sig !== "BM") throw new Error("Not BMP");

  const dataOffset = buffer.readUInt32LE(0x0a);
  const headerSize = buffer.readUInt32LE(0x0e);
  const width = buffer.readInt32LE(0x12);
  const height = buffer.readInt32LE(0x16);
  const bpp = buffer.readUInt16LE(0x1c);
  const compression = buffer.readUInt32LE(0x1e);

  if (compression !== 0)
    throw new Error(`Compressed BMP not supported (bpp=${bpp})`);
  if (bpp !== 8 && bpp !== 4)
    throw new Error(`Only 4/8-bit BMP supported (bpp=${bpp})`);

  const paletteCount = 1 << bpp;
  const paletteOff = 0x0e + headerSize;
  const palette = new Array(paletteCount);
  for (let i = 0; i < paletteCount; i++) {
    const p = paletteOff + i * 4;
    palette[i] = {
      b: buffer[p],
      g: buffer[p + 1],
      r: buffer[p + 2],
      a: buffer[p + 3] === 0 ? 255 : buffer[p + 3],
    };
  }

  const pixels = new Uint8Array(width * height);

  if (bpp === 8) {
    const rowSize = Math.floor((width + 3) / 4) * 4;
    for (let y = 0; y < height; y++) {
      const srcRow = dataOffset + (height - 1 - y) * rowSize;
      const dstRow = y * width;
      for (let x = 0; x < width; x++) {
        pixels[dstRow + x] = buffer[srcRow + x];
      }
    }
  } else {
    // bpp === 4
    const rowSize = Math.floor((width * 4 + 31) / 32) * 4;
    for (let y = 0; y < height; y++) {
      const srcRow = dataOffset + (height - 1 - y) * rowSize;
      const dstRow = y * width;
      for (let x = 0; x < width; x++) {
        const b = buffer[srcRow + (x >> 1)];
        pixels[dstRow + x] = x & 1 ? b & 0x0f : b >> 4;
      }
    }
  }

  return { width, height, bpp, palette, pixels };
}

module.exports = { parseBmp };
