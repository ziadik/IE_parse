const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const { CACHE_DIR, CACHE_VERSION, SAVE_DIR, GAME_DIR } = require("../version");
const { getBiff, areaBifName } = require("../lib/cache");
const { parseWedFile } = require("../../parsers/wed");
const { parseAreFile } = require("../../parsers/are");
const { extractByType } = require("../../parsers/bif");
const { extractFileFromSave } = require("../../parsers/sav");

//Doors
router.get("/area/:name/doors", (req, res) => {
  const file = path.join(
    CACHE_DIR,
    req.params.name.toUpperCase(),
    "doors.json",
  );
  if (!fs.existsSync(file)) return res.status(404).json({ error: "not ready" });
  res.json(JSON.parse(fs.readFileSync(file, "utf8")));
});

router.get("/area/:name/door-sprite/:file", (req, res) => {
  const file = path.join(
    CACHE_DIR,
    req.params.name.toUpperCase(),
    "doors-preview",
    "doors",
    req.params.file,
  );
  if (!fs.existsSync(file)) return res.status(404).end();
  res.setHeader("Content-Type", "image/png");
  res.sendFile(file);
});

// GET /api/area/:name/actors
router.get("/area/:name/actors", (req, res) => {
  try {
    const name = req.params.name.toUpperCase();
    const file = path.join(CACHE_DIR, name, "actors.json");
    if (!fs.existsSync(file))
      return res.status(404).json({ error: "not ready" });
    res.json(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/area/:name/actor-sprite/:file.png
router.get("/area/:name/actor-sprite/:file", (req, res) => {
  try {
    const name = req.params.name.toUpperCase();
    const file = path.join(
      CACHE_DIR,
      name,
      "actors-preview",
      "actors",
      req.params.file,
    );
    if (!fs.existsSync(file)) return res.status(404).end();
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.sendFile(file);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
// meta.json
router.get("/area/:name/meta", (req, res) => {
  const file = path.join(CACHE_DIR, req.params.name.toUpperCase(), "meta.json");
  if (!fs.existsSync(file)) return res.status(404).json({ error: "not ready" });
  const meta = JSON.parse(fs.readFileSync(file, "utf8"));
  meta.cacheVersion = CACHE_VERSION;
  res.setHeader("Cache-Control", "public, max-age=60");
  res.json(meta);
});

// WED
router.get("/area/:name/wed", (req, res) => {
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

// ARE
router.get("/area/:name", (req, res) => {
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

module.exports = router;
