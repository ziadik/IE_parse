const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const { CACHE_DIR } = require("../version");

router.get("/area/:name/doors", (req, res) => {
  const file = path.join(
    CACHE_DIR,
    req.params.name.toUpperCase(),
    "doors.json",
  );
  if (!fs.existsSync(file)) return res.status(404).json({ error: "not ready" });
  res.json(JSON.parse(fs.readFileSync(file, "utf8")));
});

router.post("/area/:name/door/:index/toggle", (req, res) => {
  try {
    const name = req.params.name.toUpperCase();
    const idx = Number(req.params.index);
    const file = path.join(CACHE_DIR, name, "doors.json");
    const doors = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!doors[idx]) return res.status(404).json({ error: "door not found" });
    doors[idx].isOpen = !doors[idx].isOpen;
    fs.writeFileSync(file, JSON.stringify(doors));
    res.json(doors[idx]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
