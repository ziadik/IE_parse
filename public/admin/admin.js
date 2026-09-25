// --- Переключение вкладок ---
document.querySelectorAll("nav button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll("nav button")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});

// --- Утилиты ---
async function api(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// --- Вкладка Cache ---
async function loadAreas() {
  const tbody = document.querySelector("#cache-table tbody");
  tbody.innerHTML = "<tr><td colspan='4'>загрузка…</td></tr>";

  const areas = await api("/api/admin/areas");
  tbody.innerHTML = "";

  for (const a of areas) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${a.area}</td>
      <td>${a.bif}</td>
      <td>${a.ready ? "✅ готово" : "❌ нет"}</td>
      <td>
        <button data-act="info" data-area="${a.area}">📄 Инфо</button>
        <button data-act="prepare" data-area="${a.area}">⚙ Prepare</button>
        <button data-act="delete" class="danger" data-area="${a.area}">🗑 Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () =>
      onCacheAction(btn.dataset.act, btn.dataset.area),
    );
  });
}

async function onCacheAction(act, area) {
  if (act === "info") {
    const data = await api(`/api/admin/cache/${area}`);
    renderCacheInfo(data);
  } else if (act === "prepare") {
    alert("Prepare — на следующем этапе");
  } else if (act === "delete") {
    if (!confirm(`Удалить кэш ${area}?`)) return;
    await api(`/api/admin/cache/${area}`, { method: "DELETE" });
    await loadAreas();
    document.getElementById("cache-details").innerHTML = "";
  }
}

function renderCacheInfo(data) {
  const el = document.getElementById("cache-details");
  if (!data.exists) {
    el.innerHTML = `<b>${data.area}</b>: кэш отсутствует`;
    return;
  }

  let html = `<b>${data.area}</b> — всего ${humanSize(data.total)}<br><br>`;
  html += `<table><thead><tr><th>Раздел</th><th>Файлов</th><th>Размер</th></tr></thead><tbody>`;
  for (const [name, info] of Object.entries(data.dirs)) {
    html += `<tr><td>${name}</td><td>${info.files}</td><td>${humanSize(info.size)}</td></tr>`;
  }
  html += `</tbody></table>`;
  el.innerHTML = html;
}

document.getElementById("cache-refresh").addEventListener("click", loadAreas);

// --- Вкладка Config ---
async function loadConfig() {
  const data = await api("/api/admin/config");
  document.getElementById("config-view").textContent = JSON.stringify(
    data,
    null,
    2,
  );
}

// --- Старт ---
loadAreas();
loadConfig();
