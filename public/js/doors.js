import { state } from "./state.js";

export async function initDoors() {
  const canvas = document.getElementById("doorsLayer");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = state.meta.mapWidth;
  canvas.height = state.meta.mapHeight;
  ctx.imageSmoothingEnabled = false;

  const viewport = document.getElementById("viewport");

  const [doors, are] = await Promise.all([
    fetch(`/api/area/${state.area}/doors`).then((r) => r.json()),
    fetch(`/api/area/${state.area}`).then((r) => r.json()),
  ]);
  state.doors = doors;
  state.areVertices = are.vertices;
  state.doorTiles = {};

  // Загружаем все secondary tile PNG
  const uniqueIndices = new Set();
  for (const d of doors) {
    for (const c of d.tileCells || []) {
      if (c.secondaryTis != null) uniqueIndices.add(c.secondaryTis);
    }
  }

  await Promise.all(
    [...uniqueIndices].map(async (idx) => {
      const img = new Image();
      img.src = `/api/area/${state.area}/door-tile/${idx}.png`;
      try {
        await img.decode();
        state.doorTiles[idx] = img;
      } catch {}
    }),
  );

  let hoverDoor = null;

  function pointInPolygon(px, py, poly) {
    if (!poly || poly.count < 3) return false;
    const V = state.areVertices;
    let inside = false;
    let prev = V[poly.index + poly.count - 1];
    for (let i = 0; i < poly.count; i++) {
      const cur = V[poly.index + i];
      if (!prev || !cur) {
        prev = cur;
        continue;
      }
      const xi = cur.x,
        yi = cur.y;
      const xj = prev.x,
        yj = prev.y;
      const intersect =
        yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
      prev = cur;
    }
    return inside;
  }

  function drawDoors() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const d of doors) {
      // Закрытая — рисуем secondary-тайлы
      if (!d.isOpen) {
        for (const c of d.tileCells || []) {
          if (c.secondaryTis != null && state.doorTiles[c.secondaryTis]) {
            ctx.drawImage(state.doorTiles[c.secondaryTis], c.x, c.y);
          }
        }
      }

      // Hover — рамка по актуальному полигону (open или closed)
      if (d === hoverDoor) {
        const v = d.isOpen ? d.openPolygon : d.closedPolygon;
        if (v && v.count > 0) {
          ctx.strokeStyle = "#ffff00";
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (let i = 0; i < v.count; i++) {
            const pt = state.areVertices[v.index + i];
            if (!pt) continue;
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
    }
  }

  viewport.addEventListener("mousemove", (e) => {
    if (state.isDragging) return;
    const rect = viewport.getBoundingClientRect();
    const mx = (e.clientX - rect.left - state.offsetX) / state.scale;
    const my = (e.clientY - rect.top - state.offsetY) / state.scale;

    let found = null;
    for (const d of doors) {
      const poly = d.isOpen ? d.openPolygon : d.closedPolygon;
      if (pointInPolygon(mx, my, poly)) {
        found = d;
        break;
      }
    }
    if (found !== hoverDoor) {
      hoverDoor = found;
      viewport.style.cursor = found ? "pointer" : "grab";
      drawDoors();
    }
  });

  viewport.addEventListener("click", async () => {
    if (!hoverDoor || state.isDragging) return;
    const idx = doors.indexOf(hoverDoor);
    const r = await fetch(`/api/area/${state.area}/door/${idx}/toggle`, {
      method: "POST",
    });
    if (!r.ok) return;
    const updated = await r.json();
    hoverDoor.isOpen = updated.isOpen;
    hoverDoor = null; // ← сброс hover
    viewport.style.cursor = "grab";
    drawDoors();
  });

  drawDoors();
  console.log(`Двери инициализированы: ${doors.length}`);
}
