/**
 * MOS V1:
 *   0x00 "MOS "
 *   0x04 "V1  "
 *   0x08 dword blockCount
 *   0x0c dword offsetToBlocks
 *   0x10 dword paletteSize (обычно 0)
 * Block (8 байт): offset dword, size dword
 * Внутри блока: width word, height word, pixels[width*height], palette[256×3 RGB]
 */
function parseMos(buffer) {
  const sig = buffer.toString("ascii", 0, 8);
  if (!sig.startsWith("MOS ")) throw new Error(`Not MOS: ${sig}`);

  const blockCount = buffer.readUInt32LE(0x08);
  const blocksOff = buffer.readUInt32LE(0x0c);

  const blocks = [];
  for (let i = 0; i < blockCount; i++) {
    const off = buffer.readUInt32LE(blocksOff + i * 8);
    const size = buffer.readUInt32LE(blocksOff + i * 8 + 4);
    const w = buffer.readUInt16LE(off);
    const h = buffer.readUInt16LE(off + 2);
    const pixels = buffer.slice(off + 4, off + 4 + w * h);
    const palOff = off + 4 + w * h;
    const palette = [];
    for (let j = 0; j < 256; j++) {
      palette.push({
        r: buffer[palOff + j * 3 + 0],
        g: buffer[palOff + j * 3 + 1],
        b: buffer[palOff + j * 3 + 2],
      });
    }
    blocks.push({ width: w, height: h, pixels, palette });
  }
  return { blockCount, blocks };
}

module.exports = { parseMos };
