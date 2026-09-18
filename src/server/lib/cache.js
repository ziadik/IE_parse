const fs = require("fs");
const path = require("path");
const { parseBiffFile } = require("../../parsers/bif");
const { parseKeyFile } = require("../../parsers/key");
const { GAME_DIR } = require("../version");

const _biffCache = new Map();
const _keyCache = new Map();

function getBiff(biffPath) {
  if (!_biffCache.has(biffPath)) {
    console.log(`[CACHE] load BIF: ${path.basename(biffPath)}`);
    _biffCache.set(biffPath, parseBiffFile(biffPath));
  }
  return _biffCache.get(biffPath);
}

function getKey() {
  const keyPath = path.join(GAME_DIR, "chitin.key");
  if (!_keyCache.has(keyPath)) {
    _keyCache.set(keyPath, parseKeyFile(keyPath));
  }
  return _keyCache.get(keyPath);
}

function findTisEntry(resref) {
  const key = getKey();
  return key.entries.find(
    (x) => x.resref.toUpperCase() === resref && x.type === 0x03eb,
  );
}

function findBamEntry(resref) {
  const key = getKey();
  return key.entries.find(
    (x) => x.resref.toUpperCase() === resref && x.type === 0x03e8,
  );
}

function areaBifName(area) {
  return `AREA${area.substring(2)}.bif`;
}

module.exports = { getBiff, getKey, findTisEntry, findBamEntry, areaBifName };
