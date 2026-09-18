import { state } from "./state.js";
import { getVisibleRange, loadOverlayChunk } from "./chunks.js";

export function initOverlay(meta) {
  const canvas = document.getElementById("overlayLayer");
  canvas.width = meta.mapWidth;
  canvas.height = meta.mapHeight;

  const showOverlay = document.getElementById("showOverlay");
  showOverlay.addEventListener("change", renderOverlay);
}

export async function renderOverlay() {
  const { meta, CS, currentFrame, waveSet, poolSet, ovCache } = state;
  if (!meta) return;

  const canvas = document.getElementById("overlayLayer");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!document.getElementById("showOverlay").checked) return;

  const { cx0, cy0, cx1, cy1 } = getVisibleRange();
  const promises = [];
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const key = `${cx}_${cy}`;
      if (waveSet.has(key)) promises.push(loadOverlayChunk("wave", cx, cy));
      if (poolSet.has(key)) promises.push(loadOverlayChunk("pool", cx, cy));
    }
  }
  await Promise.all(promises);

  const frameX = currentFrame * CS;
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const key = `${cx}_${cy}`;
      if (waveSet.has(key)) {
        const bm = ovCache.get(`wave_${key}`);
        if (bm) ctx.drawImage(bm, frameX, 0, CS, CS, cx * CS, cy * CS, CS, CS);
      }
      if (poolSet.has(key)) {
        const bm = ovCache.get(`pool_${key}`);
        if (bm) ctx.drawImage(bm, frameX, 0, CS, CS, cx * CS, cy * CS, CS, CS);
      }
    }
  }
}

export function initAnimation() {
  let last = 0;
  const FRAME_MS = 1000 / 15;
  function animate(time) {
    if (time - last >= FRAME_MS) {
      last = time;
      state.currentFrame = (state.currentFrame + 1) % 6;
      renderOverlay();
    }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}
