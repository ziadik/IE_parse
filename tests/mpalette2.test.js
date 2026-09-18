// tests/mpalette2.test.js
const fs = require("fs");
const buf = fs.readFileSync("I:\\BG\\2da\\MPALETTE.bmp");
const dataOff = buf.readUInt32LE(0x0a);
const width = buf.readInt32LE(0x12);
const height = buf.readInt32LE(0x16);
const rowSize = Math.floor((width * 3 + 3) / 4) * 4;

// BMP строки снизу вверх
// Смотрим первую строку (сверху = последняя строка в файле)
console.log(
  `width=${width} height=${height} dataOff=${dataOff} rowSize=${rowSize}`,
);

for (let y = 0; y < 5; y++) {
  let row = [];
  for (let x = 0; x < Math.min(width, 16); x++) {
    const p = dataOff + (height - 1 - y) * rowSize + x * 3;
    const b = buf[p],
      g = buf[p + 1],
      r = buf[p + 2];
    row.push(`(${r},${g},${b})`);
  }
  console.log(`row ${y} (top):`, row.join(" "));
}
