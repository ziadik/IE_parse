// src/parsers/are.js
const { Parser } = require("binary-parser");

// --- Actor (0x110 байт) ---
const areActorParser = new Parser()
  .endianness("little")
  .string("name", { length: 32, encoding: "ascii", stripNull: true }) // 0x00
  .uint16("currentX") // 0x20
  .uint16("currentY") // 0x22
  .uint16("destX") // 0x24
  .uint16("destY") // 0x26
  .uint32("flags") // 0x28
  .skip(0x30 - 0x2c) // 0x2c–0x2f
  .uint32("actorAnimation") // 0x30
  .uint16("orientation") // 0x34
  .skip(0x80 - 0x36) // 0x36–0x7f
  .string("creResref", { length: 8, encoding: "ascii", stripNull: true }) // 0x80
  .uint32("creOffset") // 0x88
  .uint32("creSize"); // 0x8c

// --- Door (0xC8 = 200 байт) ---
const areDoorParser = new Parser()
  .endianness("little")
  .string("name", { length: 32, encoding: "ascii", stripNull: true }) // 0x00
  .string("doorId", { length: 8, encoding: "ascii", stripNull: true }) // 0x20
  .uint32("flags") // 0x28
  .uint32("openVertexIndex") // 0x2c
  .uint16("openVertexCount") // 0x30
  .uint16("closedVertexCount") // 0x32
  .uint32("closedVertexIndex") // 0x34
  .skip(0xc8 - 0x38); // до конца

// --- Header (ARE V1.0) ---
const areHeaderParser = new Parser()
  .endianness("little")
  .string("signature", { length: 4, encoding: "ascii" }) // 0x00
  .string("version", { length: 4, encoding: "ascii" }) // 0x04
  .string("wedResref", { length: 8, encoding: "ascii", stripNull: true }) // 0x08
  .uint32("lastSaved") // 0x10
  .uint32("areaFlags") // 0x14
  .skip(0x54 - 0x18) // соседи, погода
  .uint32("offsetToActors") // 0x54
  .uint16("countOfActors") // 0x58
  .uint16("countOfRegions") // 0x5a
  .uint32("offsetToRegions") // 0x5c
  .skip(0x7c - 0x60) // spawn/entrances/containers/items
  .uint32("offsetToVertices") // 0x7c
  .uint16("countOfVertices") // 0x80
  .skip(0xa4 - 0x82) // ambients, variables, ...
  .uint32("countOfDoors") // 0xa4
  .uint32("offsetToDoors"); // 0xa8

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
      destX: a.destX,
      destY: a.destY,
      orientation: a.orientation,
      actorAnimation: a.actorAnimation,
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

module.exports = { parseAreFile, areHeaderParser };
