export function initUI(meta) {
  const status = document.getElementById("status");
  status.textContent = `Готово: ${meta.width}×${meta.height}, ${meta.chunkCols}×${meta.chunkRows} чанков`;

  // FPS
  let frames = 0,
    acc = 0,
    last = performance.now();
  const fpsLabel = document.getElementById("fpsLabel");
  function tick() {
    const now = performance.now();
    frames++;
    acc += now - last;
    last = now;
    if (acc > 500) {
      fpsLabel.textContent = `${(1000 / (acc / frames)).toFixed(0)} fps`;
      frames = 0;
      acc = 0;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
