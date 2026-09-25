const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const { CACHE_DIR, GAME_DIR, SAVE_DIR } = require("../version");

// --- GET /api/admin/config ---
router.get("/admin/config", (req, res) => {
  res.json({
    GAME_DIR,
    SAVE_DIR,
    CACHE_DIR,
  });
});

// --- GET /api/admin/areas --- список BIF с AREA*
router.get("/admin/areas", (req, res) => {
  try {
    const dataDir = path.join(GAME_DIR, "data");
    const files = fs
      .readdirSync(dataDir)
      .filter((f) => /^AREA[0-9a-fA-F]{4}\.bif$/i.test(f));
    const areas = files.map((f) => {
      const name = f.replace(/^AREA/i, "").replace(/\.bif$/i, ""); // AR2600
      const areaName = "AR" + name;
      const cacheDir = path.join(CACHE_DIR, areaName);
      const ready = fs.existsSync(path.join(cacheDir, "meta.json"));
      return {
        area: areaName,
        bif: f,
        ready,
      };
    });
    res.json(areas);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- GET /api/admin/cache/:area --- состояние кэша
router.get("/admin/cache/:area", (req, res) => {
  try {
    const areaName = req.params.area.toUpperCase();
    const cacheDir = path.join(CACHE_DIR, areaName);

    if (!fs.existsSync(cacheDir)) {
      return res.json({ area: areaName, exists: false });
    }

    const stat = { area: areaName, exists: true, dirs: {}, total: 0 };

    for (const sub of [
      "base",
      "overlay",
      "door-tiles",
      "actors-preview",
      "doors",
    ]) {
      const p = path.join(cacheDir, sub);
      if (!fs.existsSync(p)) continue;
      const files = fs
        .readdirSync(p)
        .filter((f) => !fs.statSync(path.join(p, f)).isDirectory());
      let size = 0;
      for (const f of files) size += fs.statSync(path.join(p, f)).size;
      stat.dirs[sub] = { files: files.length, size };
      stat.total += size;
    }

    // meta.json, actors.json, doors.json
    for (const json of [
      "meta.json",
      "actors.json",
      "doors.json",
      "door-tiles.json",
    ]) {
      const p = path.join(cacheDir, json);
      if (!fs.existsSync(p)) continue;
      stat.dirs[json] = { files: 1, size: fs.statSync(p).size };
      stat.total += fs.statSync(p).size;
    }

    res.json(stat);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- DELETE /api/admin/cache/:area ---
router.delete("/admin/cache/:area", (req, res) => {
  try {
    const areaName = req.params.area.toUpperCase();
    const cacheDir = path.join(CACHE_DIR, areaName);
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
      console.log(`[ADMIN] Удалён кэш ${areaName}`);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
