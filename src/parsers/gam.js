/**
 * GAM V1.0/1.1:
 *   0x00 "GAME"
 *   0x04 "V1.0" / "V1.1"
 *   0x08 dword gameTime
 *   0x18 dword partyGold
 *   0x20 dword offsetToPartyNPCs
 *   0x24 dword totalPartyNPCCount
 *   0x40 resref mainArea (V1.1) или 0x38 (V2.x)
 *
 * PC (0x160 байт):
 *   0x00 word  characterSelection
 *   0x02 word  partyOrder
 *   0x04 dword creOffset
 *   0x08 dword creSize
 *   0x0c byte[32] characterName
 *   0x14 dword orientation
 *   0x18 resref currentArea
 *   0x20 word x, 0x22 word y
 */
function parseGamFile(buffer) {
  const sig = buffer.toString("ascii", 0, 4);
  if (sig !== "GAME") throw new Error(`Not GAME: ${sig}`);

  const version = buffer.toString("ascii", 4, 8);
  const gameTime = buffer.readUInt32LE(0x08);
  const partyGold = buffer.readUInt32LE(0x18);
  const offsetToPartyNPCs = buffer.readUInt32LE(0x20);
  const totalPartyNPCCount = buffer.readUInt32LE(0x24);

  const mainAreaOffset = version === "V1.1" ? 0x40 : 0x38;
  const mainArea = buffer
    .toString("ascii", mainAreaOffset, mainAreaOffset + 8)
    .replace(/\0.*$/, "");

  const PC_SIZE = 0x160;
  const partyMembers = [];
  for (let i = 0; i < totalPartyNPCCount; i++) {
    const o = offsetToPartyNPCs + i * PC_SIZE;
    partyMembers.push({
      characterSelection: buffer.readUInt16LE(o + 0x00),
      partyOrder: buffer.readUInt16LE(o + 0x02),
      creOffset: buffer.readUInt32LE(o + 0x04),
      creSize: buffer.readUInt32LE(o + 0x08),
      characterName: buffer
        .toString("ascii", o + 0x0c, o + 0x2c)
        .replace(/\0.*$/, ""),
      orientation: buffer.readUInt32LE(o + 0x14),
      currentArea: buffer
        .toString("ascii", o + 0x18, o + 0x20)
        .replace(/\0.*$/, ""),
      x: buffer.readUInt16LE(o + 0x20),
      y: buffer.readUInt16LE(o + 0x22),
    });
  }

  return {
    version,
    gameTime,
    partyGold,
    offsetToPartyNPCs,
    totalPartyNPCCount,
    mainArea,
    partyMembers,
  };
}

module.exports = { parseGamFile };
