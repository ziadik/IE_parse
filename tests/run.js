const { execFileSync } = require("child_process");
const path = require("path");

const tests = [
  "key.test.js",
  "bif.test.js",
  "wed.test.js",
  "tis.test.js",
  "bmp.test.js",
  "are.test.js",
  "gam.test.js",
  "sav.test.js",
];

let allOk = true;
for (const t of tests) {
  console.log(`\n${"═".repeat(60)}\n${t}\n${"═".repeat(60)}`);
  try {
    execFileSync(process.execPath, [path.join(__dirname, t)], {
      stdio: "inherit",
    });
  } catch (e) {
    allOk = false;
  }
}
process.exit(allOk ? 0 : 1);
