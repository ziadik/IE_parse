const express = require("express");
const path = require("path");
const router = express.Router();
const { GAME_DIR } = require("../version");
const { getBiff, areaBifName } = require("../lib/cache");
const { extractByType } = require("../../parsers/bif");
const { parseBmp } = require("../../parsers/bmp");

router.get("/area/:name/bmp/:index.png", (req, res) => {
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
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

module.exports = router;
