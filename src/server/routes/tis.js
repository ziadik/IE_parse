const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const { GAME_DIR, CACHE_DIR } = require("../version");
const { getBiff, getKey, findTisEntry } = require("../lib/cache");

function buildTisBuffer(resref) {
  const e = findTisEntry(resref);
  if (!e) throw new Error(`${resref}.TIS не найден`);
  const key = getKey();
  const bif = getBiff(path.join(GAME_DIR, key.biffs[e.biffIndex].name));
  const ts = bif.tilesets.find((t) => t.idx === e.tilesetIndex);
  if (!ts) throw new Error(`tileset idx=${e.tilesetIndex} не найден`);

  const total = 4 + ts.tileCount * (1024 + 4096);
  const out = Buffer.alloc(total);
  out.writeUInt32LE(ts.tileCount, 0);
  let off = 4;
  for (let i = 0; i < ts.tileCount; i++) {
    const toff = ts.offset + i * ts.tileSize;
    bif.buffer.copy(out, off, toff, toff + 1024);
    off += 1024;
    bif.buffer.copy(out, off, toff + 1024, toff + 1024 + 4096);
    off += 4096;
  }
  return out;
}

function serveTis(req, res, resref) {
  try {
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
}

router.get("/area/:name/tis", (req, res) =>
  serveTis(req, res, req.params.name.toUpperCase()),
);
router.get("/tis/:resref", (req, res) =>
  serveTis(req, res, req.params.resref.toUpperCase()),
);

module.exports = router;
