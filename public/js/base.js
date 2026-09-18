import { state } from "./state.js";
import { getVisibleRange, loadBaseChunk, unloadFarChunks } from "./chunks.js";

export async function renderBase() {
  const { meta, CS, COLS, ROWS, chunkCache } = state;
  if (!meta) return;

  const canvas = document.getElementById("baseLayer");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const { cx0, cy0, cx1, cy1 } = getVisibleRange();
  const promises = [];
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      promises.push(loadBaseChunk(cx, cy));
    }
  }
  await Promise.all(promises);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const bm = chunkCache.get(`${cx}_${cy}`);
      if (bm) ctx.drawImage(bm, cx * CS, cy * CS);
    }
  }

  document.getElementById("chunksLabel").textContent =
    `${chunkCache.size} chunks`;
  setTimeout(unloadFarChunks, 5000);
}

export function initBase(meta) {
  const canvas = document.getElementById("baseLayer");
  canvas.width = meta.mapWidth;
  canvas.height = meta.mapHeight;
}
