const express = require("express");
const compression = require("compression");
const fs = require("fs");
const path = require("path");

const { parseKeyFile } = require("./src/parsers/key");
const { parseBiffFile, extractByType } = require("./src/parsers/bif");
const { parseWedFile } = require("./src/parsers/wed");
const { parseTisData } = require("./src/parsers/tis");
const { parseBmp } = require("./src/parsers/bmp");
const { parseAreFile } = require("./src/parsers/are");
const { parseGamFile } = require("./src/parsers/gam");
const { extractFileFromSave, listSaveFiles } = require("./src/parsers/sav");

const GAME_DIR = process.env.GAME_DIR || "I:\\BG";
const SAVE_DIR = process.env.SAVE_DIR || "I:\\BG\\Save\\000000001-Quick-Save";
const CACHE_DIR = path.join(__dirname, "cache");
const PORT = 5173;

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

const app = express();
app.use(compression());
app.use(express.static(path.join(__dirname, "public")));
process.on("uncaughtException", (e) => console.error("❌", e.message));

// ---- кэш BIFF в памяти ----
const biffCache = new Map();
function getBiff(biffPath) {
  if (!biffCache.has(biffPath)) {
    console.log(`[CACHE] load BIF: ${path.basename(biffPath)}`);
    biffCache.set(biffPath, parseBiffFile(biffPath));
  }
  return biffCache.get(biffPath);
}

// ---- кэш KEY ----
let _key = null;
function getKey() {
  if (!_key) _key = parseKeyFile(path.join(GAME_DIR, "chitin.key"));
  return _key;
}

// ---- поиск BIF по имени области: AR2600 → AREA2600.bif ----
function areaBifName(area) {
  return `AREA${area.substring(2)}.bif`;
}

// ---- TIS → бинарный буфер (заголовок + палитры + пиксели) ----
function buildTisBuffer(resref) {
  const key = getKey();
  const e = key.entries.find(
    (x) => x.resref.toUpperCase() === resref && x.type === 0x03eb,
  );
  if (!e) throw new Error(`${resref}.TIS не найден в KEY`);

  const bifName = key.biffs[e.biffIndex].name;
  const bifPath = path.join(GAME_DIR, bifName);
  const biff = getBiff(bifPath);

  const ts = biff.tilesets.find((t) => t.idx === e.tilesetIndex);
  if (!ts) throw new Error(`tileset idx=${e.tilesetIndex} не найден`);

  const total = 4 + ts.tileCount * (1024 + 4096);
  const out = Buffer.alloc(total);
  out.writeUInt32LE(ts.tileCount, 0);

  let off = 4;
  for (let i = 0; i < ts.tileCount; i++) {
    const toff = ts.offset + i * ts.tileSize;
    biff.buffer.copy(out, off, toff, toff + 1024);
    off += 1024;
    biff.buffer.copy(out, off, toff + 1024, toff + 1024 + 4096);
    off += 4096;
  }
  return out;
}

// ---- /api/area/:name/tis → бинарный ответ + кэш на диск ----
app.get("/api/area/:name/tis", (req, res) => {
  try {
    const name = req.params.name.toUpperCase();
    const cacheFile = path.join(CACHE_DIR, `${name}.tis.bin`);

    if (fs.existsSync(cacheFile)) {
      res.setHeader("Content-Type", "application/octet-stream");
      res.sendFile(cacheFile);
      return;
    }

    const out = buildTisBuffer(name);
    fs.writeFileSync(cacheFile, out);
    res.setHeader("Content-Type", "application/octet-stream");
    res.send(out);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// ---- /api/tis/:resref → то же для WTWAVE / WTPOOL ----
app.get("/api/tis/:resref", (req, res) => {
  try {
    const resref = req.params.resref.toUpperCase();
    const cacheFile = path.join(CACHE_DIR, `${resref}.tis.bin`);
    if (fs.existsSync(cacheFile)) {
      res.setHeader("Content-Type", "application/octet-stream");
      res.sendFile(cacheFile);
      return;
    }
    const out = buildTisBuffer(resref);
    fs.writeFileSync(cacheFile, out);
    res.setHeader("Content-Type", "application/octet-stream");
    res.send(out);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// ---- /api/area/:name/wed ----
app.get("/api/area/:name/wed", (req, res) => {
  try {
    const name = req.params.name.toUpperCase();
    const biff = getBiff(path.join(GAME_DIR, "data", areaBifName(name)));
    const weds = extractByType(biff, 0x03e9);
    if (!weds.length) throw new Error("WED не найден");
    res.json(parseWedFile(weds[0].data));
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// ---- /api/area/:name (ARE из сохранения) ----
app.get("/api/area/:name", (req, res) => {
  try {
    const name = req.params.name.toUpperCase();
    const data = extractFileFromSave(
      path.join(SAVE_DIR, "BALDUR.SAV"),
      `${name}.ARE`,
    );
    res.json(parseAreFile(data));
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

// ---- /api/save-info (GAM) ----
app.get("/api/save-info", (req, res) => {
  try {
    const gam = parseGamFile(
      fs.readFileSync(path.join(SAVE_DIR, "BALDUR.GAM")),
    );
    res.json(gam);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- /api/save/files ----
app.get("/api/save/files", (req, res) => {
  try {
    res.json(listSaveFiles(path.join(SAVE_DIR, "BALDUR.SAV")));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- /api/area/:name/bmp/:index.png ----
app.get("/api/area/:name/bmp/:index.png", (req, res) => {
  try {
    const name = req.params.name.toUpperCase();
    const idx = Number(req.params.index);
    const biff = getBiff(path.join(GAME_DIR, "data", areaBifName(name)));
    const bmps = extractByType(biff, 0x0001);
    const b = bmps[idx];
    if (!b) throw new Error(`BMP[${idx}] не найден`);
    const bmp = parseBmp(b.data);
    const rgba = Buffer.alloc(bmp.width * bmp.height * 4);
    for (let i = 0; i < bmp.pixels.length; i++) {
      const c = bmp.palette[bmp.pixels[i]];
      rgba[i * 4 + 0] = c.r;
      rgba[i * 4 + 1] = c.g;
      rgba[i * 4 + 2] = c.b;
      rgba[i * 4 + 3] = c.a;
    }
    res.json({
      width: bmp.width,
      height: bmp.height,
      bpp: bmp.bpp,
      rgba: rgba.toString("base64"),
    });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ http://localhost:${PORT}`);
  console.log(`   GAME_DIR=${GAME_DIR}`);
  console.log(`   SAVE_DIR=${SAVE_DIR}`);
  console.log(`   CACHE_DIR=${CACHE_DIR}`);
});
