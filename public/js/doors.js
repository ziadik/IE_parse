export function initDoors(are, meta) {
  const canvas = document.getElementById("uiLayer");
  const ctx = canvas.getContext("2d");

  if (!are.doors || !are.vertices) return;

  ctx.strokeStyle = "#ff0";
  ctx.lineWidth = 2;
  for (const d of are.doors) {
    const v = d.openVertices;
    if (!v || v.count < 2) continue;
    ctx.beginPath();
    for (let i = 0; i < v.count; i++) {
      const pt = are.vertices[v.index + i];
      if (!pt) continue;
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();
    ctx.stroke();
  }
}
