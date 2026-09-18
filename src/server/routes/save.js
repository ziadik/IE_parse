const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const { SAVE_DIR } = require("../version");
const { parseGamFile } = require("../../parsers/gam");
const { listSaveFiles } = require("../../parsers/sav");

router.get("/save-info", (req, res) => {
  try {
    const gam = parseGamFile(
      fs.readFileSync(path.join(SAVE_DIR, "BALDUR.GAM")),
    );
    res.json(gam);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/save/files", (req, res) => {
  try {
    res.json(listSaveFiles(path.join(SAVE_DIR, "BALDUR.SAV")));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
