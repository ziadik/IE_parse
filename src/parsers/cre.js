// CRE V1.0/V1.1 (BG1) — заголовок
// AnimationID — смещение 0x28 (младшие 16 бит — индекс в avatars.2da)

function parseCreHeader(buffer, offset = 0) {
  const sig = buffer.toString("ascii", offset, offset + 4);
  if (sig !== "CRE ") throw new Error(`Not CRE: '${sig}'`);

  const version = buffer.toString("ascii", offset + 4, offset + 8);

  return {
    version,
    longStrRef: buffer.readUInt32LE(offset + 0x08),
    shortStrRef: buffer.readUInt32LE(offset + 0x0c),
    flags: buffer.readUInt32LE(offset + 0x10),
    xpValue: buffer.readUInt32LE(offset + 0x14),
    xp: buffer.readUInt32LE(offset + 0x18),
    gold: buffer.readUInt32LE(offset + 0x1c),
    state: buffer.readUInt32LE(offset + 0x20),
    hp: buffer.readUInt16LE(offset + 0x24),
    maxHP: buffer.readUInt16LE(offset + 0x26),
    animationID: buffer.readUInt32LE(offset + 0x28),
  };
}

module.exports = { parseCreHeader };
