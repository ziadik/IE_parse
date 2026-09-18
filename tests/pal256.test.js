const fs = require("fs");
const path = require("path");

const f = "I:\\BG\\2da\\mpal256.bmp";
const buf = fs.readFileSync(f);
console.log("size:", buf.length);
console.log("sig:", buf.toString("ascii", 0, 2));
const headerSize = buf.readUInt32LE(0x0e);
const width = buf.readInt32LE(0x12);
const height = buf.readInt32LE(0x16);
const bpp = buf.readUInt16LE(0x1c);
console.log(
  `headerSize=${headerSize} width=${width} height=${height} bpp=${bpp}`,
);

const palOff = 0x0e + headerSize;
console.log(`palette offset: ${palOff}`);
console.log("первые 16 цветов (BGRA):");
for (let i = 0; i < 16; i++) {
  const p = palOff + i * 4;
  console.log(
    `  [${i}] B=${buf[p]} G=${buf[p + 1]} R=${buf[p + 2]} A=${buf[p + 3]}`,
  );
}

// Проверим группу 1 (цвета 16..31)
console.log("\nцвета 16..31:");
for (let i = 16; i < 32; i++) {
  const p = palOff + i * 4;
  console.log(`  [${i}] B=${buf[p]} G=${buf[p + 1]} R=${buf[p + 2]}`);
}
