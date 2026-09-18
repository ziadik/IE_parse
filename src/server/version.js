const path = require("path");

module.exports = {
  PORT: process.env.PORT || 5173,
  CACHE_VERSION: "v2.0.0", // меняется при рефакторинге
  GAME_DIR: process.env.GAME_DIR || "I:\\BG",
  SAVE_DIR: process.env.SAVE_DIR || "I:\\BG\\Save\\000000001-Quick-Save",
  CACHE_DIR: path.join(__dirname, "..", "..", "cache"),
};
