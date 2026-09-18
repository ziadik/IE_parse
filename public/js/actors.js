import { state } from "./state.js";

export function initActors(are) {
  const canvas = document.getElementById("uiLayer");
  canvas.width = state.meta.mapWidth;
  canvas.height = state.meta.mapHeight;

  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  // Точки акторов
  if (are.actors) {
    ctx.fillStyle = "rgba(255,0,0,0.8)";
    for (const a of are.actors) {
      ctx.beginPath();
      ctx.arc(a.x, a.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}
