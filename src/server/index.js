const express = require("express");
const compression = require("compression");
const path = require("path");
const { PORT } = require("./version");

const app = express();
app.use(compression());
app.use(express.static(path.join(__dirname, "..", "..", "public")));
process.on("uncaughtException", (e) => console.error("❌", e.message));

app.use("/api", require("./routes/save"));
app.use("/api", require("./routes/area"));
app.use("/api", require("./routes/tis"));
app.use("/api", require("./routes/chunk"));
app.use("/api", require("./routes/bmp"));

app.use("/api", require("./routes/doors"));

app.listen(PORT, async () => {
  console.log(`✅ http://localhost:${PORT}`);
  const { bootstrapPrepare } = require("./lib/bootstrap");
  await bootstrapPrepare();
});
