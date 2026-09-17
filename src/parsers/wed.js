const { Reader } = require("../utils/buffer");

/**
 * WED V1.3:
 *   0x00 "WED V1.3"
 *   0x08 dword overlayCount
 *   0x0c dword doorCount
 *   0x10 dword offsetToOverlays
 *   0x14 dword offsetToSecondaryHeader
 *   0x18 dword offsetToDoors
 *   0x1c dword offsetToDoorTileCellIndices
 *
 * Overlay (24 байта):
 *   0x00 word  width
 *   0x02 word  height
 *   0x04 resref tilesetName
 *   0x0c word  uniqueTileCount
 *   0x0e word  movementType
 *   0x10 dword offsetToTilemap
 *   0x14 dword offsetToTileIndexLookup
 *
 * Tilemap entry (10 байт):
 *   0x00 word primaryTileStart  (индекс в TIL lookup)
 *   0x02 word primaryTileCount
 *   0x04 word secondaryTileIndex (0xffff если нет)
 *   0x06 byte overlayFlags
 *   0x07 byte animSpeed
 *   0x08 word wFlags (используется для дверей)
 *
 * Door (0x1c = 28 байт):
 *   0x00 resref name
 *   0x08 word  state (0 open, 1 closed)
 *   0x0a word  firstDoorTileCellIndex
 *   0x0c word  doorTileCellCount
 *   0x0e word  openPolygonCount
 *   0x10 word  closedPolygonCount
 *   0x12 dword offsetToOpenPolygons
 *   0x16 dword offsetToClosedPolygons
 *   0x1a padding
 *
 * Secondary header (20 байт):
 *   0x00 dword polygonCount
 *   0x04 dword offsetToPolygons
 *   0x08 dword offsetToVertices
 *   0x0c dword offsetToWallGroups
 *   0x10 dword offsetToPolygonIndices
 */
function parseWedFile(buffer) {
  const sig = buffer.toString("ascii", 0, 8);
  if (sig !== "WED V1.3") throw new Error(`Not WED V1.3: ${sig}`);

  const overlayCount = buffer.readUInt32LE(0x08);
  const doorCount = buffer.readUInt32LE(0x0c);
  const offsetToOverlays = buffer.readUInt32LE(0x10);
  const offsetToSecondaryHeader = buffer.readUInt32LE(0x14);
  const offsetToDoors = buffer.readUInt32LE(0x18);
  const offsetToDoorTileCells = buffer.readUInt32LE(0x1c);

  // --- Overlays ---
  const overlays = [];
  for (let i = 0; i < overlayCount; i++) {
    const o = offsetToOverlays + i * 24;
    const width = buffer.readUInt16LE(o + 0x00);
    const height = buffer.readUInt16LE(o + 0x02);
    const tilesetName = buffer
      .toString("ascii", o + 0x04, o + 0x0c)
      .replace(/\0.*$/, "");
    const uniqueTileCount = buffer.readUInt16LE(o + 0x0c);
    const movementType = buffer.readUInt16LE(o + 0x0e);
    const tilemapOffset = buffer.readUInt32LE(o + 0x10);
    const tilOffset = buffer.readUInt32LE(o + 0x14);

    // --- Tilemap ---
    const tileCount = width * height;
    const tilemap = [];
    for (let j = 0; j < tileCount; j++) {
      const toff = tilemapOffset + j * 10;
      const primaryTileStart = buffer.readUInt16LE(toff + 0);
      const primaryTileCount = buffer.readUInt16LE(toff + 2);
      const secondaryTileIndex = buffer.readUInt16LE(toff + 4);
      const overlayFlags = buffer.readUInt8(toff + 6);
      const animSpeed = buffer.readUInt8(toff + 7);
      const wFlags = buffer.readUInt16LE(toff + 8);

      // TIL: primaryTileCount word'ов по tilOffset + primaryTileStart*2
      const indices = [];
      for (let k = 0; k < primaryTileCount; k++) {
        const loff = tilOffset + (primaryTileStart + k) * 2;
        indices.push(buffer.readUInt16LE(loff));
      }

      tilemap.push({
        primaryTileStart,
        primaryTileCount,
        secondaryTileIndex,
        overlayFlags,
        animSpeed,
        wFlags,
        indices,
      });
    }

    overlays.push({
      width,
      height,
      tilesetName,
      uniqueTileCount,
      movementType,
      tilemapOffset,
      tilOffset,
      tilemap,
    });
  }

  // --- Doors ---
  const doors = [];
  for (let i = 0; i < doorCount; i++) {
    const o = offsetToDoors + i * 0x1c;
    doors.push({
      name: buffer.toString("ascii", o, o + 8).replace(/\0.*$/, ""),
      state: buffer.readUInt16LE(o + 0x08),
      firstDoorTileCellIndex: buffer.readUInt16LE(o + 0x0a),
      doorTileCellCount: buffer.readUInt16LE(o + 0x0c),
      openPolygonCount: buffer.readUInt16LE(o + 0x0e),
      closedPolygonCount: buffer.readUInt16LE(o + 0x10),
      offsetToOpenPolygons: buffer.readUInt32LE(o + 0x12),
      offsetToClosedPolygons: buffer.readUInt32LE(o + 0x16),
    });
  }

  // --- Secondary header ---
  const sh = offsetToSecondaryHeader;
  const secondary = {
    polygonCount: buffer.readUInt32LE(sh + 0x00),
    offsetToPolygons: buffer.readUInt32LE(sh + 0x04),
    offsetToVertices: buffer.readUInt32LE(sh + 0x08),
    offsetToWallGroups: buffer.readUInt32LE(sh + 0x0c),
    offsetToPolygonIndices: buffer.readUInt32LE(sh + 0x10),
  };

  const base = overlays[0];
  return {
    overlayCount,
    doorCount,
    width: base.width,
    height: base.height,
    tileSize: 64,
    pixelWidth: base.width * 64,
    pixelHeight: base.height * 64,
    tilesetName: base.tilesetName,
    overlays,
    doors,
    secondary,
    offsetToDoorTileCells,
  };
}

module.exports = { parseWedFile };
