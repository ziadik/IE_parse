const express = require("express");
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

const GAME_DIR = process.env.BG_DIR || "I:\\BG";
const SAVE_DIR = process.env.SAVE_DIR || "I:\\BG\\Save\\000000001-Quick-Save";
const PORT = 5173;
const AREA = "AR2600";

const app = express();
app.use(express.static(path.join(__dirname, "public")));

process.on("uncaughtException", (e) => console.error("❌", e.message));

// --- /api/save-info (BALDUR.GAM из папки save) ---
app.get("/api/save-info", (req, res) => {
  try {
    const gam = parseGamFile(fs.readFileSync(path.join(SAVE_DIR, "BALDUR.GAM")));
    res.json(gam);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- /api/save/files ---
app.get("/api/save/files", (req, res) => {
  try {
    res.json(listSaveFiles(path.join(SAVE_DIR, "BALDUR.SAV")));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- /api/area/:name (ARE из BALDUR.SAV) ---
app.get("/api/area/:name", (req, res) => {
  try {
    const name = req.params.name.toUpperCase();
    const data = extractFileFromSave(path.join(SAVE_DIR, "BALDUR.SAV"), `${name}.ARE`);
    res.json(parseAreFile(data));
  } catch (e) { res.status(404).json({ error: e.message }); }
});

// --- /api/area/:name/wed ---
app.get("/api/area/:name/wed", (req, res) => {
  try {
    const name = req.params.name.toUpperCase();       // AR2600
    const bifName = `AREA${name.substring(2)}.bif`;   // AREA2600.bif
    const biff = parseBiffFile(path.join(GAME_DIR, "data", bifName));
    const weds = extractByType(biff, 0x03e9);
    if (!weds.length) throw new Error("WED не найден");
    res.json(parseWedFile(weds[0].data));
  } catch (e) { res.status(404).json({ error: e.message }); }
});

// --- /api/area/:name/tis ---
app.get("/api/area/:name/tis", (req, res) => {
  try {
    const name = req.params.name.toUpperCase();
    const key = parseKeyFile(path.join(GAME_DIR, "chitin.key"));
    const e = key.entries.find(x => x.resref.toUpperCase() === name && x.type === 0x03eb);
    if (!e) throw new Error(`${name}.TIS не найден в KEY`);

    const bifName = key.biffs[e.biffIndex].name;
    const bifPath = path.join(GAME_DIR, bifName);
    const biff = parseBiffFile(bifPath);

    const ts = biff.tilesets.find(t => t.idx === e.tilesetIndex);
    if (!ts) throw new Error(`tileset idx=${e.tilesetIndex} не найден в BIF`);

    const tis = parseTisData(biff.buffer, ts.offset, ts.tileCount, ts.tileSize);

    res.json({
      tileCount: tis.tileCount,
      tileSize: tis.tileSize,
      tiles: tis.tiles.map(t => ({
        palette: Buffer.from(t.palette).toString("base64"),
        pixels:  t.pixels.toString("base64"),
      })),
    });
  } catch (err) { res.status(404).json({ error: err.message }); }
});

// --- /api/area/:name/bmp/:index.png ---
app.get("/api/area/:name/bmp/:index.png", (req, res) => {
  try {
    const name = req.params.name.toUpperCase();
    const idx = Number(req.params.index);
    const biff = parseBiffFile(path.join(GAME_DIR, "data", `AREA${name.substring(2)}.bif`));
    const bmps = extractByType(biff, 0x0001);
    const b = bmps[idx];
    if (!b) throw new Error(`BMP[${idx}] не найден`);
    const bmp = parseBmp(b.data);
    const rgba = Buffer.alloc(bmp.width * bmp.height * 4);
    for (let i = 0; i < bmp.pixels.length; i++) {
      const c = bmp.palette[bmp.pixels[i]];
      rgba[i*4+0] = c.r; rgba[i*4+1] = c.g; rgba[i*4+2] = c.b; rgba[i*4+3] = c.a;
    }
    res.json({ width: bmp.width, height: bmp.height, bpp: bmp.bpp, rgba: rgba.toString("base64") });
  } catch (err) { res.status(404).json({ error: err.message }); }
});

app.listen(PORT, () => {
  console.log(`✅ http://localhost:${PORT}`);
  console.log(`   /api/save-info`);
  console.log(`   /api/save/files`);
  console.log(`   /api/area/${AREA}`);
  console.log(`   /api/area/${AREA}/wed`);
  console.log(`   /api/area/${AREA}/tis`);
  console.log(`   /api/area/${AREA}/bmp/0.png`);
});
