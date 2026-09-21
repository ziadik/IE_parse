const path = require("path");

async function prepareDoors(are, wed, outDir) {
  const enrichedDoors = [];
  const base = wed.overlays[0];
  const W = base.width;

  const wedDoorsByName = {};
  for (const d of wed.doors) {
    const cells = [];
    for (let k = 0; k < d.doorTileCellCount; k++) {
      const off =
        wed.offsetToDoorTileCells + (d.firstDoorTileCellIndex + k) * 2;
      const tilemapIdx = wed.buffer.readUInt16LE(off);
      const cell = base.tilemap[tilemapIdx];
      if (cell) {
        cells.push({
          tilemapIndex: tilemapIdx,
          x: (tilemapIdx % W) * 64,
          y: Math.floor(tilemapIdx / W) * 64,
          primaryTis: cell.indices[0],
          secondaryTis:
            cell.secondaryTileIndex !== 0xffff ? cell.secondaryTileIndex : null,
        });
      }
    }
    wedDoorsByName[d.name.toUpperCase()] = cells;
  }

  for (let i = 0; i < are.doors.length; i++) {
    const d = are.doors[i];
    const tileCells = wedDoorsByName[d.doorId.toUpperCase()] || [];

    let cx = 0,
      cy = 0;
    const v = d.openVertices;
    if (v && v.count > 0 && are.vertices) {
      for (let k = 0; k < v.count; k++) {
        const pt = are.vertices[v.index + k];
        if (pt) {
          cx += pt.x;
          cy += pt.y;
        }
      }
      cx = Math.round(cx / v.count);
      cy = Math.round(cy / v.count);
    }

    enrichedDoors.push({
      index: i,
      name: d.name,
      doorId: d.doorId,
      x: cx,
      y: cy,
      isOpen: d.isOpen,
      isLocked: d.isLocked,
      tileCells,
      openPolygon: d.openVertices,
      closedPolygon: d.closedVertices,
    });
  }

  return enrichedDoors;
}

module.exports = { prepareDoors };
