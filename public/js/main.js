import { state } from "./state.js";
import { api } from "./api.js";
import { initChunks } from "./chunks.js";
import { initViewport } from "./viewport.js";
import { initBase, renderBase } from "./base.js";
import { initOverlay, renderOverlay, initAnimation } from "./overlay.js";
import { initActors } from "./actors.js";
import { initDoors } from "./doors.js";
import { initUI } from "./ui.js";

(async () => {
  const status = document.getElementById("status");
  status.textContent = "meta…";
  const meta = await api.meta(state.area);
  initChunks(meta);
  initBase(meta);
  
  initOverlay(meta);
  initUI(meta);

  status.textContent = "ARE…";
  const are = await api.are(state.area);

  // UI layer: акторы + двери
  await initActors();
  // initActors(are);
  await initDoors(are, meta);

  // Зум/панорама
  initViewport({
    onMove: () => {
      renderBase();
      renderOverlay();
    },
  });

  // Анимация overlay
  initAnimation();

  await renderBase();
  await renderOverlay();
})();
