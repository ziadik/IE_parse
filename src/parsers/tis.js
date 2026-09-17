/**
 * BG1 TIS tile:
 *   0x00 palette[1024]  256 × BGRA
 *   0x400 pixels[4096]  64×64 индексов
 * Итого 5120 байт на тайл.
 *
 * Встроенный TIS (tileset entry в BIF) НЕ имеет заголовка — палитра сразу с offset тайла.
 */
function parseTisData(buffer, offset, tileCount, tileSize) {
  if (tileSize !== 5120) {
    throw new Error(`BG1 tileSize должен быть 5120, получено ${tileSize}`);
  }

  const tiles = [];
  for (let i = 0; i < tileCount; i++) {
    const toff = offset + i * tileSize;

    // Палитра: 256 × BGRA
    const palette = new Uint8Array(256 * 3);
    for (let j = 0; j < 256; j++) {
      const p = toff + j * 4;
      palette[j * 3 + 0] = buffer[p + 2]; // R
      palette[j * 3 + 1] = buffer[p + 1]; // G
      palette[j * 3 + 2] = buffer[p + 0]; // B
    }

    // Пиксели: 4096 индексов
    const pixels = Buffer.from(buffer.slice(toff + 1024, toff + 1024 + 4096));

    tiles.push({ palette, pixels });
  }

  return { tileCount, tileSize, tiles };
}

module.exports = { parseTisData };
