import { state } from "./state.js";

export function initChunks(meta) {
  state.meta = meta;
  state.CS = meta.chunkSize;
  state.COLS = meta.chunkCols;
  state.ROWS = meta.chunkRows;
  state.waveSet = new Set(meta.overlays?.wave?.chunks || []);
  state.poolSet = new Set(meta.overlays?.pool?.chunks || []);
}

export function getVisibleRange() {
  const viewport = document.getElementById("viewport");
  const vw = viewport.clientWidth,
    vh = viewport.clientHeight;
  const { scale, offsetX, offsetY, CS, COLS, ROWS } = state;

  const viewLeft = -offsetX / scale;
  const viewTop = -offsetY / scale;
  const viewRight = viewLeft + vw / scale;
  const viewBottom = viewTop + vh / scale;

  const cx0 = Math.max(0, Math.floor(viewLeft / CS) - 1);
  const cy0 = Math.max(0, Math.floor(viewTop / CS) - 1);
  const cx1 = Math.min(COLS - 1, Math.floor(viewRight / CS) + 1);
  const cy1 = Math.min(ROWS - 1, Math.floor(viewBottom / CS) + 1);
  return { cx0, cy0, cx1, cy1 };
}

export async function loadBaseChunk(cx, cy) {
  const key = `${cx}_${cy}`;
  if (state.chunkCache.has(key)) return state.chunkCache.get(key);
  if (state.chunkLoading.has(key)) return state.chunkLoading.get(key);

  const p = (async () => {
    const url = `/api/area/${state.area}/chunk/base/${cx}_${cy}.webp?v=${state.meta.cacheVersion}`;
    const r = await fetch(url);
    if (!r.ok) {
      state.chunkCache.set(key, null);
      return null;
    }
    const bm = await createImageBitmap(await r.blob());
    state.chunkCache.set(key, bm);
    return bm;
  })();

  state.chunkLoading.set(key, p);
  const result = await p;
  state.chunkLoading.delete(key);
  return result;
}

export async function loadOverlayChunk(kind, cx, cy) {
  const key = `${kind}_${cx}_${cy}`;
  if (state.ovCache.has(key)) return state.ovCache.get(key);
  if (state.ovLoading.has(key)) return state.ovLoading.get(key);

  const p = (async () => {
    const url = `/api/area/${state.area}/chunk/overlay/${kind}_${cx}_${cy}.webp?v=${state.meta.cacheVersion}`;
    const r = await fetch(url);
    if (!r.ok) {
      state.ovCache.set(key, null);
      return null;
    }
    const bm = await createImageBitmap(await r.blob());
    state.ovCache.set(key, bm);
    return bm;
  })();

  state.ovLoading.set(key, p);
  const result = await p;
  state.ovLoading.delete(key);
  return result;
}

export function unloadFarChunks() {
  const { cx0, cy0, cx1, cy1 } = getVisibleRange();
  const PAD = 2;
  for (const [key, bm] of state.chunkCache) {
    const [cx, cy] = key.split("_").map(Number);
    if (cx < cx0 - PAD || cx > cx1 + PAD || cy < cy0 - PAD || cy > cy1 + PAD) {
      if (bm) bm.close();
      state.chunkCache.delete(key);
    }
  }
  for (const [key, bm] of state.ovCache) {
    const [, cx, cy] = key.split("_").map(Number);
    if (cx < cx0 - PAD || cx > cx1 + PAD || cy < cy0 - PAD || cy > cy1 + PAD) {
      if (bm) bm.close();
      state.ovCache.delete(key);
    }
  }
}
