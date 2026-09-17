const fs = require("fs");

/**
 * BIFF V1:
 *   0x00 "BIFF"
 *   0x04 "V1  "
 *   0x08 dword fileCount
 *   0x0c dword tilesetCount
 *   0x10 dword offsetToFileEntries
 *
 * File entry (16 байт):
 *   0x00 dword resourceLocator (bits 0-13 = fileIndex, 14-19 = tilesetIndex)
 *   0x04 dword offset
 *   0x08 dword size
 *   0x0c word  type
 *   0x0e word  unknown
 *
 * Tileset entry (20 байт):
 *   0x00 dword resourceLocator
 *   0x04 dword offset
 *   0x08 dword tileCount
 *   0x0c dword tileSize
 *   0x10 word  type (always 0x03eb TIS)
 *   0x12 word  unknown
 */
const RES_TYPES = {
  0x0001: "BMP",
  0x0002: "MVE",
  0x0004: "WAV",
  0x03e8: "BAM",
  0x03e9: "WED",
  0x03ea: "ARE",
  0x03eb: "TIS",
  0x03ec: "WMP",
  0x03ed: "CRE",
  0x03ee: "SPL",
  0x03ef: "ITM",
  0x03f0: "PRO",
  0x03f1: "BCS",
  0x03f2: "IDS",
  0x03f3: "GAM",
  0x03f4: "EFF",
  0x03f6: "PLT",
  0x03f8: "MOS",
  0x03fd: "2DA",
};

function parseBiffFile(biffPath) {
  const buffer = fs.readFileSync(biffPath);
  const sig = buffer.toString("ascii", 0, 4);
  if (sig !== "BIFF") throw new Error(`Not BIFF: ${sig}`);

  const fileCount = buffer.readUInt32LE(0x08);
  const tilesetCount = buffer.readUInt32LE(0x0c);
  const entriesOff = buffer.readUInt32LE(0x10);

  const files = [];
  for (let i = 0; i < fileCount; i++) {
    const e = entriesOff + i * 16;
    const locator = buffer.readUInt32LE(e);
    const offset = buffer.readUInt32LE(e + 0x04);
    const size = buffer.readUInt32LE(e + 0x08);
    const type = buffer.readUInt16LE(e + 0x0c);
    files.push({
      resourceLocator: locator,
      fileIndex: locator & 0x3fff,
      tilesetIndex: (locator >>> 14) & 0x3f,
      offset,
      size,
      type,
      typeName: RES_TYPES[type] || `UNKNOWN(0x${type.toString(16)})`,
    });
  }

  const tilesets = [];
  const tsOff = entriesOff + fileCount * 16;
  for (let i = 0; i < tilesetCount; i++) {
    const e = tsOff + i * 20;
    const locator = buffer.readUInt32LE(e);
    const offset = buffer.readUInt32LE(e + 0x04);
    const tileCount = buffer.readUInt32LE(e + 0x08);
    const tileSize = buffer.readUInt32LE(e + 0x0c);
    const type = buffer.readUInt16LE(e + 0x10);
    tilesets.push({
      idx: (locator >>> 14) & 0x3f,
      offset,
      tileCount,
      tileSize,
      type,
    });
  }

  return { buffer, fileCount, tilesetCount, files, tilesets };
}

function extractByType(biff, type) {
  return biff.files
    .filter((f) => f.type === type)
    .map((f) => ({
      ...f,
      data: biff.buffer.slice(f.offset, f.offset + f.size),
    }));
}

function extractByFileIndex(biff, fileIndex) {
  const f = biff.files.find((x) => x.fileIndex === fileIndex);
  if (!f) return null;
  return { ...f, data: biff.buffer.slice(f.offset, f.offset + f.size) };
}

module.exports = {
  parseBiffFile,
  extractByType,
  extractByFileIndex,
  RES_TYPES,
};
