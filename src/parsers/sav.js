const fs = require("fs");
const zlib = require("zlib");

/**
 * SAV V1.0:
 *   0x00 "SAV V1.0"
 *   0x08: файлы:
 *     dword nameLen
 *     char[nameLen] name (нуль-терминатор включён)
 *     dword uncompressedSize
 *     dword compressedSize
 *     byte[compressedSize] zlib-поток
 */
function extractFileFromSave(savePath, targetFilename) {
  const buffer = fs.readFileSync(savePath);
  const sig = buffer.toString("ascii", 0, 8);
  if (sig !== "SAV V1.0") throw new Error(`Not SAV V1.0: ${sig}`);

  const targetUpper = targetFilename.toUpperCase();
  let offset = 8;

  while (offset < buffer.length) {
    const nameLen = buffer.readUInt32LE(offset);
    offset += 4;
    const name = buffer.toString("ascii", offset, offset + nameLen - 1);
    offset += nameLen;
    const uncompressedSize = buffer.readUInt32LE(offset);
    offset += 4;
    const compressedSize = buffer.readUInt32LE(offset);
    offset += 4;

    if (name.toUpperCase() === targetUpper) {
      const compressedData = buffer.slice(offset, offset + compressedSize);
      return zlib.inflateSync(compressedData);
    }
    offset += compressedSize;
  }
  throw new Error(`File ${targetFilename} not found in ${savePath}`);
}

function listSaveFiles(savePath) {
  const buffer = fs.readFileSync(savePath);
  const files = [];
  let offset = 8;
  while (offset < buffer.length) {
    const nameLen = buffer.readUInt32LE(offset);
    offset += 4;
    const name = buffer.toString("ascii", offset, offset + nameLen - 1);
    offset += nameLen;
    const uncompressedSize = buffer.readUInt32LE(offset);
    offset += 4;
    const compressedSize = buffer.readUInt32LE(offset);
    offset += 4;
    files.push({ name, uncompressedSize, compressedSize, offset });
    offset += compressedSize;
  }
  return files;
}

module.exports = { extractFileFromSave, listSaveFiles };
