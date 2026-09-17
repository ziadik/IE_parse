const path = require("path");
const { parseBiffFile, extractByType } = require("../src/parsers/bif");
const { parseBmp } = require("../src/parsers/bmp");

const BG_DIR = process.env.BG_DIR || "I:\\BG";
const biff = parseBiffFile(path.join(BG_DIR, "data", "AREA2600.bif"));
const bmps = extractByType(biff, 0x0001);

console.log("=== BMP test ===");
let ok = true;
for (const b of bmps) {
  try {
    const bmp = parseBmp(b.data);
    console.log(
      `BMP[${b.fileIndex}]: ${bmp.width}×${bmp.height} bpp=${bmp.bpp}`,
    );
    // средний цвет
    let sumR = 0,
      sumG = 0,
      sumB = 0;
    for (let i = 0; i < bmp.pixels.length; i++) {
      const c = bmp.palette[bmp.pixels[i]];
      sumR += c.r;
      sumG += c.g;
      sumB += c.b;
    }
    const n = bmp.pixels.length;
    console.log(
      `  средний цвет: ${(sumR / n) | 0},${(sumG / n) | 0},${(sumB / n) | 0}`,
    );
    console.log(
      `  первые 8 цветов палитры: ${bmp.palette
        .slice(0, 8)
        .map((c) => `${c.r},${c.g},${c.b}`)
        .join(" | ")}`,
    );
  } catch (e) {
    console.log(`❌ BMP[${b.fileIndex}]: ${e.message}`);
    ok = false;
  }
}

const asserts = [["3 BMP в BIF", bmps.length === 3]];
for (const [label, cond] of asserts) {
  console.log(`${cond ? "✅" : "❌"} ${label}`);
  if (!cond) ok = false;
}
process.exit(ok ? 0 : 1);
