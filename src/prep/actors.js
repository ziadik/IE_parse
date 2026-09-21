const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { parseCreHeader } = require("../parsers/cre");
const { parseBamFile } = require("../parsers/bam");
const { parseKeyFile } = require("../parsers/key");
const { parseBiffFile } = require("../parsers/bif");
const { loadPalette16, setupPaperdollColours } = require("./palette16");
const GAME_DIR = process.env.GAME_DIR || "I:\\BG";


// Один раз при загрузке модуля:
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

// --- Дефолтная палитра (для BAM, у которых нет своей) ---
// Для большинства BG1 монстров палитра встроена (colorCount > 0).
// Если нет — серая.

// --- BAM → PNG ---
async function bamToPng(bamBuffer, creColors, cycleIndex = 0, frameIndex = 0) {
  const parsed = parseBamFile(bamBuffer);
  const cycle = parsed.cycles[cycleIndex];
  if (!cycle || !cycle.length) return null;
  const fi = cycle[Math.min(frameIndex, cycle.length - 1)];
  const f = parsed.frames[fi];
  const { rgba, indices } = parsed.decodedFrames[fi];
  if (!rgba || !f.width || !f.height) return null;

  // Если BAM fake-color (colorCount=0) и есть цвета из CRE — применяем палитру
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

  return sharp(Buffer.from(finalRGBA), {
    raw: { width: f.width, height: f.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

// --- Основная функция: сгенерить PNG для всех акторов ---
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
    let spriteFile = null;
    let spriteW = 0,
      spriteH = 0;
    let spriteOffX = 0,
      spriteOffY = 0;

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
              try {
                const png = await bamToPng(found.bam, cre.colors, 0, 0);
                if (png) {
                  spriteFile = `actors/${i}.png`;
                  fs.writeFileSync(path.join(outDir, spriteFile), png);

                  // Получаем размеры и offset кадра
                  const parsed = parseBamFile(found.bam);
                  const cycle = parsed.cycles[0];
                  const fi = cycle[0];
                  const f = parsed.frames[fi];
                  spriteW = f.width;
                  spriteH = f.height;
                  spriteOffX = f.x;
                  spriteOffY = f.y;
                }
              } catch (e) {
                console.warn(`[ACTOR ${i}] bamToPng: ${e.message}`);
              }
              break;
            }
          }
        }
      }
    } catch (e) {
      console.warn(`[ACTOR ${i}] ${e.message}`);
    }

    enrichedActors.push({
      x: a.x,
      y: a.y,
      animID: `0x${animID.toString(16)}`,
      prefix,
      bamName,
      sprite: spriteFile,
      spriteW,
      spriteH,
      spriteOffX,
      spriteOffY,
    });
  }

  return enrichedActors;
}

module.exports = { prepareActors };
