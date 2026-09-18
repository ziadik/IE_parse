const { Parser } = require("binary-parser");

// Actor (0x110 байт)
const areActorParser = new Parser()
  .endianness("little")
  .string("name", { length: 32, encoding: "ascii", stripNull: true }) // 0x00
  .uint16("currentX") // 0x20
  .uint16("currentY") // 0x22
  .uint16("destX") // 0x24
  .uint16("destY") // 0x26
  .uint32("flags") // 0x28
  .skip(0x80 - 0x2c) // до 0x80
  .string("creResref", { length: 8, encoding: "ascii", stripNull: true }) // 0x80
  .uint32("creOffset") // 0x88
  .uint32("creSize"); // 0x8c

// Door (0xC8)
const areDoorParser = new Parser()
  .endianness("little")
  .string("name", { length: 32, encoding: "ascii", stripNull: true })
  .string("doorId", { length: 8, encoding: "ascii", stripNull: true })
  .uint32("flags")
  .uint32("openVertexIndex")
  .uint16("openVertexCount")
  .uint16("closedVertexCount")
  .uint32("closedVertexIndex")
  .skip(0xc8 - 0x38);

// ARE Header
const areHeaderParser = new Parser()
  .endianness("little")
  .string("signature", { length: 4, encoding: "ascii" })
  .string("version", { length: 4, encoding: "ascii" })
  .string("wedResref", { length: 8, encoding: "ascii", stripNull: true })
  .uint32("lastSaved")
  .uint32("areaFlags")
  .skip(0x54 - 0x18)
  .uint32("offsetToActors")
  .uint16("countOfActors")
  .uint16("countOfRegions")
  .uint32("offsetToRegions")
  .skip(0x7c - 0x60)
  .uint32("offsetToVertices")
  .uint16("countOfVertices")
  .skip(0xa4 - 0x82)
  .uint32("countOfDoors")
  .uint32("offsetToDoors");

function parseAreFile(buffer) {
  const header = areHeaderParser.parse(buffer);

  // Actors
  const actors = [];
  const ACTOR_SIZE = 0x110;
  for (let i = 0; i < header.countOfActors; i++) {
    const off = header.offsetToActors + i * ACTOR_SIZE;
    if (off + ACTOR_SIZE > buffer.length) break;
    const a = areActorParser.parse(buffer.slice(off, off + ACTOR_SIZE));
    actors.push({
      name: a.name || "Unknown",
      x: a.currentX,
      y: a.currentY,
      creFile: a.creResref,
      creOffset: a.creOffset,
      creSize: a.creSize,
      flags: a.flags,
    });
  }

  // Doors
  const doors = [];
  const DOOR_SIZE = 0xc8;
  for (let i = 0; i < header.countOfDoors; i++) {
    const off = header.offsetToDoors + i * DOOR_SIZE;
    if (off + DOOR_SIZE > buffer.length) break;
    const d = areDoorParser.parse(buffer.slice(off, off + DOOR_SIZE));
    doors.push({
      name: d.name,
      doorId: d.doorId,
      isOpen: (d.flags & 1) !== 0,
      isLocked: (d.flags & 2) !== 0,
      openVertices: { index: d.openVertexIndex, count: d.openVertexCount },
      closedVertices: {
        index: d.closedVertexIndex,
        count: d.closedVertexCount,
      },
    });
  }

  // Vertices
  const vertices = [];
  for (let i = 0; i < header.countOfVertices; i++) {
    const off = header.offsetToVertices + i * 4;
    if (off + 4 > buffer.length) break;
    vertices.push({
      x: buffer.readUInt16LE(off),
      y: buffer.readUInt16LE(off + 2),
    });
  }

  return {
    signature: header.signature,
    version: header.version,
    wedFile: header.wedResref,
    stats: {
      actors: header.countOfActors,
      regions: header.countOfRegions,
      doors: header.countOfDoors,
      vertices: header.countOfVertices,
    },
    actors,
    doors,
    vertices,
  };
}

module.exports = { parseAreFile };
