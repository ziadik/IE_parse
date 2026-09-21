const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { parseCreHeader } = require("../parsers/cre");
const { parseBamFile } = require("../parsers/bam");
const { parseKeyFile } = require("../parsers/key");
const { parseBiffFile } = require("../parsers/bif");
const { loadPalette16, setupPaperdollColours } = require("./palette16");

const GAME_DIR = process.env.GAME_DIR || "I:\\BG";

let _palLoaded = false;
function ensurePalette() {
  if (_palLoaded) return;
  loadPalette16(path.join(GAME_DIR, "2da", "MPALETTE.bmp"));
  _palLoaded = true;
}

// --- avatars.2da ---
function parseAvatars2da(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (
      !line.trim() ||
      line.includes("AT_1") ||
      line.startsWith("2DA") ||
      line.trim() === "*"
    )
      continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 8) continue;
    const id = parseInt(parts[0], 16);
    if (isNaN(id)) continue;
    rows.push({
      id,
      at1: parts[1],
      at2: parts[2],
      at3: parts[3],
      at4: parts[4],
      type: parseInt(parts[5]),
      space: parseInt(parts[6]),
      palette: parts[7],
      size: parts[8] || "*",
    });
  }
  rows.sort((a, b) => a.id - b.id);
  return rows;
}

let _avatars = null;
function loadAvatars() {
  if (_avatars) return _avatars;
  const text = fs.readFileSync(
    path.join(GAME_DIR, "2da", "avatars.2da"),
    "ascii",
  );
  _avatars = parseAvatars2da(text);
  return _avatars;
}

function findAvatar(animID) {
  const rows = loadAvatars();
  const id = animID & 0xffff;
  let best = null;
  for (const r of rows) {
    if (r.id <= id) best = r;
    else break;
  }
  return best;
}

// --- KEY/BIF ---
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
  return {
    bam: biff.buffer.slice(f.offset, f.offset + f.size),
    biffName,
    resref,
  };
}

// --- BAM → PNG (один кадр) ---
async function bamToPng(bamBuffer, creColors, cycleIndex, frameIndex) {
  const parsed = parseBamFile(bamBuffer);
  const cycle = parsed.cycles[cycleIndex];
  if (!cycle || !cycle.length) return null;
  const fi = cycle[Math.min(frameIndex, cycle.length - 1)];
  const f = parsed.frames[fi];
  const { rgba, indices } = parsed.decodedFrames[fi];
  if (!rgba || !f.width || !f.height) return null;

  let finalRGBA = rgba;

  if (parsed.colorCount === 0 && creColors && indices) {
    const fakePal = setupPaperdollColours(creColors);
    finalRGBA = new Uint8ClampedArray(f.width * f.height * 4);
    for (let i = 0; i < f.width * f.height; i++) {
      const idx = indices[i];
      if (idx === 0) {
        finalRGBA[i * 4 + 3] = 0;
      } else {
        const c = fakePal[idx];
        finalRGBA[i * 4 + 0] = c.r;
        finalRGBA[i * 4 + 1] = c.g;
        finalRGBA[i * 4 + 2] = c.b;
        finalRGBA[i * 4 + 3] = 255;
      }
    }
  }

  return {
    png: await sharp(Buffer.from(finalRGBA), {
      raw: { width: f.width, height: f.height, channels: 4 },
    })
      .png()
      .toBuffer(),
    w: f.width,
    h: f.height,
    offX: f.x,
    offY: f.y,
  };
}

// --- Все кадры цикла ---
async function bamToFrames(bamBuffer, creColors, cycleIndex) {
  const parsed = parseBamFile(bamBuffer);
  const cycle = parsed.cycles[cycleIndex];
  if (!cycle || !cycle.length) return [];

  const frames = [];
  for (let k = 0; k < cycle.length; k++) {
    const fr = await bamToPng(bamBuffer, creColors, cycleIndex, k);
    frames.push(fr);
  }
  return frames;
}

// --- Основная функция ---
async function prepareActors(areBuffer, areParsed, outDir) {
  ensurePalette();
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(path.join(outDir, "actors"), { recursive: true });

  const enrichedActors = [];

  for (let i = 0; i < areParsed.actors.length; i++) {
    const a = areParsed.actors[i];
    let animID = 0;
    let prefix = null;
    let bamName = null;
    let anims = { walk: [], stand: [], attack: [] };

    try {
      if (a.creOffset && a.creOffset + 0x28 < areBuffer.length) {
        const cre = parseCreHeader(areBuffer, a.creOffset);
        animID = cre.animationID;
        const av = findAvatar(animID);
        if (av) {
          prefix = av.at1;
          const candidates = [`${prefix}G1`, `${prefix}G11`];
          for (const cand of candidates) {
            const found = findBam(cand);
            if (found) {
              bamName = cand;

              // orientation 0..15 → direction 0..7
              const dir = Math.floor((a.orientation || 0) / 2) % 8;

              // cycles (для BAM CHAAnim):
              //   0..7   = walk  (8 направлений)
              //   8..15  = stand (8 направлений)
              //   16..23 = attack (8 направлений)
              anims.walk = (
                await bamToFrames(found.bam, cre.colors, dir)
              ).filter(Boolean);
              anims.stand = (
                await bamToFrames(found.bam, cre.colors, 16 + dir)
              ).filter(Boolean);
              anims.attack = (
                await bamToFrames(found.bam, cre.colors, 16 + dir)
              ).filter(Boolean);
              break;
            }
          }
        }
      }
    } catch (e) {
      console.warn(`[ACTOR ${i}] ${e.message}`);
    }

    // Сохраняем кадры
    const saveFrames = (name, frames) => {
      for (let k = 0; k < frames.length; k++) {
        fs.writeFileSync(
          path.join(outDir, "actors", `${i}_${name}_${k}.png`),
          frames[k].png,
        );
      }
      return frames.map((_, k) => `actors/${i}_${name}_${k}.png`);
    };

    const walkFiles = saveFrames("walk", anims.walk);
    const standFiles = saveFrames("stand", anims.stand);
    const attackFiles = saveFrames("attack", anims.attack);

    const ref = anims.stand[0] ||
      anims.walk[0] ||
      anims.attack[0] || { w: 0, h: 0, offX: 0, offY: 0 };

    enrichedActors.push({
      x: a.x,
      y: a.y,
      orientation: a.orientation || 0,
      animID: `0x${animID.toString(16)}`,
      prefix,
      bamName,
      frameW: ref.w,
      frameH: ref.h,
      frameOffX: ref.offX,
      frameOffY: ref.offY,
      anims: {
        walk: { frames: walkFiles, count: walkFiles.length },
        stand: { frames: standFiles, count: standFiles.length },
        attack: { frames: attackFiles, count: attackFiles.length },
      },
      // дефолтная анимация:
      // если актор стоит на месте (dest == current) — stand, иначе walk
      currentAnim:
        a.destX === a.currentX && a.destY === a.currentY ? "stand" : "walk",
    });
  }

  return enrichedActors;
}

module.exports = { prepareActors };
