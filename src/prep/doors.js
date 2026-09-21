const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { parseKeyFile } = require("../parsers/key");
const { parseBiffFile } = require("../parsers/bif");
const { parseBamFile } = require("../parsers/bam");

const GAME_DIR = process.env.GAME_DIR || "I:\\BG";

let _key = null;
function getKey() {
  if (_key) return _key;
  _key = parseKeyFile(path.join(GAME_DIR, "chitin.key"));
  return _key;
}

const _biffCache = new Map();
function getBiff(biffPath) {
  if (!_biffCache.has(biffPath))
    _biffCache.set(biffPath, parseBiffFile(biffPath));
  return _biffCache.get(biffPath);
}

function findBam(resref) {
  const key = getKey();
  const e = key.entries.find(
    (x) => x.resref.toUpperCase() === resref.toUpperCase() && x.type === 0x03e8,
  );
  if (!e) return null;
  const biffName = key.biffs[e.biffIndex].name;
  const biff = getBiff(path.join(GAME_DIR, biffName));
  const f = biff.files.find((x) => x.fileIndex === e.fileIndex);
  if (!f) return null;
  return biff.buffer.slice(f.offset, f.offset + f.size);
}

async function prepareDoors(are, outDir) {
  fs.mkdirSync(path.join(outDir, "doors"), { recursive: true });
  const enrichedDoors = [];

  for (let i = 0; i < are.doors.length; i++) {
    const d = are.doors[i];
    let spriteFile = null;
    let spriteW = 0,
      spriteH = 0,
      spriteOffX = 0,
      spriteOffY = 0;
    let bamName = null;

    try {
      // Пробуем разные варианты имени
      const candidates = [
        d.doorId, // DOOR2618
        d.doorId.toUpperCase(), // DOOR2618
        `${d.doorId.toUpperCase()}G1`, // DOOR2618G1 (walk? нет)
      ];

      let bamBuffer = null;
      for (const cand of candidates) {
        bamBuffer = findBam(cand);
        if (bamBuffer) {
          bamName = cand;
          break;
        }
      }

      if (bamBuffer) {
        const parsed = parseBamFile(bamBuffer);
        const cycle = parsed.cycles[d.isOpen ? 0 : 1] || parsed.cycles[0];
        if (cycle && cycle.length) {
          const fi = cycle[0];
          const f = parsed.frames[fi];
          const { rgba } = parsed.decodedFrames[fi];
          if (rgba && f.width && f.height) {
            const png = await sharp(Buffer.from(rgba), {
              raw: { width: f.width, height: f.height, channels: 4 },
            })
              .png()
              .toBuffer();
            spriteFile = `doors/${i}.png`;
            fs.writeFileSync(path.join(outDir, spriteFile), png);
            spriteW = f.width;
            spriteH = f.height;
            spriteOffX = f.x;
            spriteOffY = f.y;
          }
        }
      }
    } catch (e) {
      console.warn(`[DOOR ${i}] ${e.message}`);
    }

    // Центр полигона двери — как позиция спрайта
    const v = d.openVertices;
    let cx = 0,
      cy = 0;
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
      name: d.name,
      doorId: d.doorId,
      x: cx,
      y: cy,
      isOpen: d.isOpen,
      isLocked: d.isLocked,
      bamName,
      sprite: spriteFile,
      spriteW,
      spriteH,
      spriteOffX,
      spriteOffY,
    });
  }

  return enrichedDoors;
}

module.exports = { prepareDoors };
