const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const { CACHE_DIR } = require("../version");

router.get("/area/:name/chunk/:kind/:file", (req, res) => {
  const { name, kind, file } = req.params;
  const p = path.join(CACHE_DIR, name.toUpperCase(), kind, file);
  if (!fs.existsSync(p)) return res.status(404).end();
  res.setHeader("Content-Type", "image/webp");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.sendFile(p);
});

module.exports = router;
