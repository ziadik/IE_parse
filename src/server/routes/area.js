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
