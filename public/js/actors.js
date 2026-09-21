import { state } from "./state.js";

export async function initActors() {
  const canvas = document.getElementById("uiLayer");
  const ctx = canvas.getContext("2d");
  canvas.width = state.meta.mapWidth;
  canvas.height = state.meta.mapHeight;
  ctx.imageSmoothingEnabled = false;

  const actors = await (await fetch(`/api/area/${state.area}/actors`)).json();
  state.actors = actors;
  console.log(`Акторов: ${actors.length}`);

  // Загружаем все PNG для всех анимаций каждого актора
  const actorImgs = [];
  for (let i = 0; i < actors.length; i++) {
    const a = actors[i];
    const perAnim = {};
    for (const name of ["walk", "stand", "attack"]) {
      const arr = [];
      const list = a.anims?.[name]?.frames || [];
      for (const f of list) {
        const img = new Image();
        img.src = `/api/area/${state.area}/actor-sprite/${f.split("/").pop()}`;
        try {
          await img.decode();
          arr.push(img);
        } catch {}
      }
      perAnim[name] = arr;
    }
    actorImgs.push(perAnim);
  }

  // Анимация
  let frame = 0;
  let lastTime = 0;
  const FRAME_MS = 150;

  function draw(time) {
    if (time - lastTime >= FRAME_MS) {
      lastTime = time;
      frame++;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < actors.length; i++) {
      const a = actors[i];
      const imgs = actorImgs[i];
      const anim = imgs[a.currentAnim] || imgs.stand || imgs.walk;
      if (!anim || !anim.length) continue;

      const img = anim[frame % anim.length];
      const dx = a.x - (a.frameOffX || 0);
      const dy = a.y - (a.frameOffY || 0);
      ctx.drawImage(img, dx, dy);
    }

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}
