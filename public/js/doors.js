import { state } from "./state.js";

export async function initDoors() {
  const canvas = document.getElementById("uiLayer");
  const ctx = canvas.getContext("2d");

  const doors = await (await fetch(`/api/area/${state.area}/doors`)).json();
  console.log(`Дверей: ${doors.length}`);

  for (const d of doors) {
    if (!d.sprite) continue;
    await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const dx = d.x - (d.spriteOffX || 0);
        const dy = d.y - (d.spriteOffY || 0);
        ctx.drawImage(img, dx, dy);
        resolve();
      };
      img.onerror = resolve;
      img.src = `/api/area/${state.area}/door-sprite/${d.sprite.split("/").pop()}`;
    });
  }
}
