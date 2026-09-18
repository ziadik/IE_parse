import { state } from "./state.js";

export async function initActors() {
  const canvas = document.getElementById("uiLayer");
  const ctx = canvas.getContext("2d");
  canvas.width = state.meta.mapWidth;
  canvas.height = state.meta.mapHeight;

  const actors = await (await fetch(`/api/area/${state.area}/actors`)).json();
  console.log(`Акторов: ${actors.length}`);

  const promises = actors.map((a, i) => {
    if (!a.sprite) return Promise.resolve();
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const dx = a.x - (a.spriteOffX || 0);
        const dy = a.y - (a.spriteOffY || 0);
        ctx.drawImage(img, dx, dy);
        resolve();
      };
      img.onerror = resolve;
      img.src = `/api/area/${state.area}/actor-sprite/${a.sprite.split("/").pop()}`;
    });
  });

  await Promise.all(promises);
  state.actors = actors;
}
