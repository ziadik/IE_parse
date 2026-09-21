const fs = require("fs");

let _palette16 = null; // массив 79 строк × 16 RGB

function loadPalette16(bmpPath) {
  if (_palette16) return _palette16;

  const buf = fs.readFileSync(bmpPath);
  const dataOff = buf.readUInt32LE(0x0a);
  const width = buf.readInt32LE(0x12);
  const height = buf.readInt32LE(0x16);
  const bpp = buf.readUInt16LE(0x1c);

  if (bpp !== 24)
    throw new Error(`MPALETTE.bmp: ожидался 24-bit, получен ${bpp}`);

  const rowSize = Math.floor((width * 3 + 3) / 4) * 4;
  const groups = [];

  // BMP: строки снизу вверх. Нам нужны строки сверху вниз:
  // row 0 = нижняя в файле
  for (let y = 0; y < height; y++) {
    const srcRow = dataOff + (height - 1 - y) * rowSize;
    const colors = [];
    for (let x = 0; x < width; x++) {
      const p = srcRow + x * 3;
      colors.push({
        r: buf[p + 2],
        g: buf[p + 1],
        b: buf[p + 0],
        a: 255,
      });
    }
    groups.push(colors);
  }

  _palette16 = groups;
  return _palette16;
}

function getPalette16(idx) {
  if (!_palette16) throw new Error("Palette16 не загружена");
  idx = Math.max(0, Math.min(_palette16.length - 1, idx));
  return _palette16[idx];
}

/**
 * Строит 256-цветную палитру для fake-color актора.
 * colors: массив из 7 байт (metal, minor, major, skin, leather, armor, hair).
 */
function setupPaperdollColours(colors) {
  const buffer = new Array(256)
    .fill(null)
    .map(() => ({ r: 0, g: 0, b: 0, a: 255 }));

  // Порядок: METAL=0, MINOR, MAJOR, SKIN, LEATHER, ARMOR, HAIR
  const startIdx = 0x04;
  const numCols = 12;

  for (let i = 0; i < 7; i++) {
    const colorIdx = colors[i] || 0;
    const pal16 = getPalette16(colorIdx);
    for (let c = 0; c < numCols; c++) {
      buffer[startIdx + i * 12 + c] = pal16[c] || { r: 0, g: 0, b: 0, a: 255 };
    }
  }

  // Заполнение «дублей» (как в GemRB):
  const memcpy = (dst, src, n) => {
    for (let i = 0; i < n; i++) buffer[dst + i] = { ...buffer[src + i] };
  };

  memcpy(0x58, 0x11, 8); // minor
  memcpy(0x60, 0x1d, 8); // major
  memcpy(0x68, 0x11, 8); // minor
  memcpy(0x70, 0x05, 8); // metal
  memcpy(0x78, 0x35, 8); // leather
  memcpy(0x80, 0x35, 8); // leather
  memcpy(0x88, 0x11, 8); // minor
  for (let i = 0x90; i < 0xa8; i += 8) memcpy(i, 0x35, 8); // leather
  memcpy(0xb0, 0x29, 8); // skin
  for (let i = 0xb8; i < 0xff; i += 8) memcpy(i, 0x35, 8); // leather

  // Тень
  buffer[1] = { r: 0, g: 0, b: 0, a: 255 };

  return buffer;
}

module.exports = { loadPalette16, getPalette16, setupPaperdollColours };
