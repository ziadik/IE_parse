/**
 * ARE V1.0:
 *   0x00 "AREA"
 *   0x04 "V1.0"
 *   0x08 resref WED
 *   0x10 dword lastSaved
 *   0x14 dword areaFlags
 *   0x54 dword offsetToActors
 *   0x58 word  actorCount
 *   0x5a word  regionCount
 *   0x5c dword offsetToRegions
 *   0x7c dword offsetToVertices
 *   0x80 word  vertexCount
 *   0xa4 dword doorCount
 *   0xa8 dword offsetToDoors
 *
 * Actor (0x110 байт):
 *   0x00 byte[32] name
 *   0x20 word currentX, 0x22 word currentY
 *   0x24 word destX,    0x26 word destY
 *   0x28 dword flags
 *   0x80 resref creResref
 *
 * Door (0xc8 байт):
 *   0x00 byte[32] name
 *   0x20 resref doorId
 *   0x28 dword flags
 *   0x2c dword openVertexIndex, 0x30 word openVertexCount
 *   0x32 word closedVertexCount, 0x34 dword closedVertexIndex
 */
function parseAreFile(buffer) {
  const sig = buffer.toString("ascii", 0, 8);
  if (!sig.startsWith("AREA")) throw new Error(`Not AREA: ${sig}`);

  const version = buffer.toString("ascii", 4, 8);
  const wedResref = buffer.toString("ascii", 0x08, 0x10).replace(/\0.*$/, "");
  const lastSaved = buffer.readUInt32LE(0x10);
  const areaFlags = buffer.readUInt32LE(0x14);

  const offsetToActors = buffer.readUInt32LE(0x54);
  const actorCount = buffer.readUInt16LE(0x58);
  const regionCount = buffer.readUInt16LE(0x5a);
  const offsetToRegions = buffer.readUInt32LE(0x5c);
  const offsetToVertices = buffer.readUInt32LE(0x7c);
  const vertexCount = buffer.readUInt16LE(0x80);
  const doorCount = buffer.readUInt32LE(0xa4);
  const offsetToDoors = buffer.readUInt32LE(0xa8);

  // Actors
  const actors = [];
  const ACTOR_SIZE = 0x110;
  for (let i = 0; i < actorCount; i++) {
    const o = offsetToActors + i * ACTOR_SIZE;
    actors.push({
      name: buffer.toString("ascii", o, o + 32).replace(/\0.*$/, ""),
      x: buffer.readUInt16LE(o + 0x20),
      y: buffer.readUInt16LE(o + 0x22),
      destX: buffer.readUInt16LE(o + 0x24),
      destY: buffer.readUInt16LE(o + 0x26),
      flags: buffer.readUInt32LE(o + 0x28),
      creFile: buffer
        .toString("ascii", o + 0x80, o + 0x88)
        .replace(/\0.*$/, ""),
    });
  }

  // Doors
  const doors = [];
  const DOOR_SIZE = 0xc8;
  for (let i = 0; i < doorCount; i++) {
    const o = offsetToDoors + i * DOOR_SIZE;
    doors.push({
      name: buffer.toString("ascii", o, o + 32).replace(/\0.*$/, ""),
      doorId: buffer.toString("ascii", o + 0x20, o + 0x28).replace(/\0.*$/, ""),
      flags: buffer.readUInt32LE(o + 0x28),
      isOpen: !!(buffer.readUInt32LE(o + 0x28) & 1),
      isLocked: !!(buffer.readUInt32LE(o + 0x28) & 2),
      openVertices: {
        index: buffer.readUInt32LE(o + 0x2c),
        count: buffer.readUInt16LE(o + 0x30),
      },
      closedVertices: {
        index: buffer.readUInt32LE(o + 0x34),
        count: buffer.readUInt16LE(o + 0x32),
      },
    });
  }

  // Vertices
  const vertices = [];
  for (let i = 0; i < vertexCount; i++) {
    const o = offsetToVertices + i * 4;
    vertices.push({
      x: buffer.readUInt16LE(o),
      y: buffer.readUInt16LE(o + 2),
    });
  }

  return {
    version,
    wedResref,
    lastSaved,
    areaFlags,
    stats: {
      actors: actorCount,
      regions: regionCount,
      doors: doorCount,
      vertices: vertexCount,
    },
    actors,
    doors,
    vertices,
  };
}

module.exports = { parseAreFile };
