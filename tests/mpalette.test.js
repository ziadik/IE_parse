// tests/mpalette.test.js
const fs = require("fs");
const path = require("path");

const f = "I:\\BG\\2da\\MPALETTE.bmp";
const buf = fs.readFileSync(f);
console.log("size:", buf.length);
console.log("sig:", buf.toString("ascii", 0, 2));
const headerSize = buf.readUInt32LE(0x0e);
const width = buf.readInt32LE(0x12);
const height = buf.readInt32LE(0x16);
const bpp = buf.readUInt16LE(0x1c);
const dataOff = buf.readUInt32LE(0x0a);
console.log(
  `headerSize=${headerSize} width=${width} height=${height} bpp=${bpp} dataOff=${dataOff}`,
);
