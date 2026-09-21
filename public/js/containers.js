export async function initContainers() {
  const canvas = document.getElementById("uiLayer");
  const ctx = canvas.getContext("2d");

  const are = await (await fetch(`/api/area/${state.area}`)).json();
  state.containers = are.containers || [];
  console.log(`Контейнеров: ${state.containers.length}`);

  // Простой вариант: коричневые точки
  for (const c of state.containers) {
    ctx.fillStyle = "rgba(139,69,19,0.9)"; // коричневый
    ctx.beginPath();
    ctx.arc(c.x, c.y, 6, 0, 2 * Math.PI);
    ctx.fill();

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
