const fs = require("fs");
const path = require("path");

/**
 * KEY V1:
 *   0x00 "KEY "
 *   0x04 "V1  "
 *   0x08 dword biffCount
 *   0x0c dword keyCount
 *   0x10 dword biffOffset
 *   0x14 dword keyOffset
 *
 * BIF entry (12 байт, фиксированный):
 *   0x00 dword bifLen
 *   0x04 dword nameOffset (абсолютный)
 *   0x08 word  nameLen
 *   0x0a word  bifLocator
 *
 * KEY entry (14 байт):
 *   0x00 resref[8]
 *   0x08 word type
 *   0x0a dword locator
 *        bits 0-13  fileIndex в BIF
 *        bits 14-19 tileset index (для TIS)
 *        bits 20-31 biffIndex
 */
function parseKeyFile(keyPath) {
  const buf = fs.readFileSync(keyPath);
  const sig = buf.toString("ascii", 0, 4);
  if (sig !== "KEY ") throw new Error(`Not KEY: ${sig}`);

  const biffCount = buf.readUInt32LE(0x08);
  const keyCount = buf.readUInt32LE(0x0c);
  const biffOffset = buf.readUInt32LE(0x10);
  const keyOffset = buf.readUInt32LE(0x14);

  // BIF-записи: 12 байт каждая, имя по абсолютному offset
  const biffs = [];
  for (let i = 0; i < biffCount; i++) {
    const e = biffOffset + i * 12;
    const bifLen = buf.readUInt32LE(e + 0x00);
    const nameOffset = buf.readUInt32LE(e + 0x04);
    const nameLen = buf.readUInt16LE(e + 0x08);
    const bifLocator = buf.readUInt16LE(e + 0x0a);
    const name = buf
      .toString("ascii", nameOffset, nameOffset + nameLen)
      .replace(/\0/g, "")
      .replace(/\\/g, path.sep);
    biffs.push({ biffIndex: i, name, bifLocator, bifLen });
  }

  // KEY-записи: 14 байт каждая
  const entries = [];
  for (let i = 0; i < keyCount; i++) {
    const e = keyOffset + i * 14;
    const resref = buf.toString("ascii", e, e + 8).replace(/\0/g, "");
    const type = buf.readUInt16LE(e + 0x08);
    const locator = buf.readUInt32LE(e + 0x0a);
    const biffIndex = locator >>> 20;
    const fileIndex = locator & 0x3fff;
    const tilesetIndex = (locator >>> 14) & 0x3f;
    entries.push({ resref, type, locator, biffIndex, fileIndex, tilesetIndex });
  }

  return { biffs, entries };
}

module.exports = { parseKeyFile };
