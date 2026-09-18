import { state } from "./state.js";

export function initViewport({ onMove }) {
  const viewport = document.getElementById("viewport");
  const layers = document.getElementById("layers");
  const zoomLabel = document.getElementById("zoomLabel");

  function applyTransform() {
    layers.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.scale})`;
    zoomLabel.textContent = `${Math.round(state.scale * 100)}%`;
    onMove();
  }

  viewport.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const mx = e.clientX - rect.left,
        my = e.clientY - rect.top;
      const old = state.scale;
      state.scale = Math.max(
        0.1,
        Math.min(8, state.scale - Math.sign(e.deltaY) * 0.15),
      );
      state.offsetX = mx - (mx - state.offsetX) * (state.scale / old);
      state.offsetY = my - (my - state.offsetY) * (state.scale / old);
      applyTransform();
    },
    { passive: false },
  );

  viewport.addEventListener("mousedown", (e) => {
    state.isDragging = true;
    state.dragStartX = e.clientX - state.offsetX;
    state.dragStartY = e.clientY - state.offsetY;
    viewport.classList.add("dragging");
  });
  window.addEventListener("mousemove", (e) => {
    if (!state.isDragging) return;
    state.offsetX = e.clientX - state.dragStartX;
    state.offsetY = e.clientY - state.dragStartY;
    applyTransform();
  });
  window.addEventListener("mouseup", () => {
    state.isDragging = false;
    viewport.classList.remove("dragging");
  });

  document.getElementById("zoomIn").onclick = () => {
    state.scale = Math.min(8, state.scale * 1.25);
    applyTransform();
  };
  document.getElementById("zoomOut").onclick = () => {
    state.scale = Math.max(0.1, state.scale / 1.25);
    applyTransform();
  };
  document.getElementById("zoomReset").onclick = () => {
    state.scale = 1;
    state.offsetX = 0;
    state.offsetY = 0;
    applyTransform();
  };

  applyTransform();

  return {
    getViewport: () => viewport,
    applyTransform,
  };
}
