const { parseBamFile } = require("./src/parsers/bam");
const { parseKeyFile } = require("./src/parsers/key");
const { parseBiffFile } = require("./src/parsers/bif");

const key = parseKeyFile("I:\\BG\\chitin.key");
const e = key.entries.find(
  (x) => x.resref.toUpperCase() === "CHMF1G1" && x.type === 0x03e8,
);
console.log("CHMF1G1:", e);

if (e) {
  const biff = parseBiffFile("I:\\BG\\" + key.biffs[e.biffIndex].name);
  const f = biff.files.find((x) => x.fileIndex === e.fileIndex);
  const bam = parseBamFile(biff.buffer.slice(f.offset, f.offset + f.size));
  console.log(`frameCount=${bam.frameCount} cycles=${bam.cycles.length}`);
  for (let i = 0; i < bam.cycles.length; i++) {
    console.log(`cycle[${i}]: ${bam.cycles[i].length} frames`);
  }
  console.log(`first frame: ${bam.frames[0].width}x${bam.frames[0].height}`);
}
