const $ = (s) => document.querySelector(s);
const MAX_CLIP = window.MAX_CLIP || 600;

const state = { job: null, clips: [], markIn: null, markOut: null, previewEnd: null };
const player = $("#player");
const canvas = $("#timeline");

// ------------------------------------------------------------ utilidades
function fmt(sec) {
  if (sec == null || isNaN(sec)) return "—";
  sec = Math.max(0, sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const ss = s.toFixed(1).padStart(4, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}
function parseTime(str) {
  const parts = String(str).trim().split(":").map(Number);
  if (parts.some(isNaN)) return NaN;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}
async function api(url, body) {
  const res = await fetch(url, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {});
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}
function setStatus(prefix, pct, msg, error = false) {
  const box = $(`#${prefix}-status`);
  box.classList.remove("hidden");
  box.classList.toggle("error", error);
  $(`#${prefix}-bar`).style.width = `${pct}%`;
  $(`#${prefix}-msg`).textContent = msg;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------ 1. descarga / subida
$("#dl-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.submitter; btn.disabled = true;
  try {
    const { id } = await api("/api/download", { url: $("#url").value, quality: $("#quality").value });
    await pollJob(id);
  } catch (err) {
    setStatus("dl", 0, err.message, true);
  } finally { btn.disabled = false; }
});

$("#file").addEventListener("change", async () => {
  const file = $("#file").files[0];
  if (!file) return;
  const form = new FormData(); form.append("file", file);
  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/api/upload");
  xhr.upload.onprogress = (e) => e.lengthComputable && setStatus("dl", (e.loaded * 100) / e.total, "Subiendo…");
  xhr.onload = () => {
    const data = JSON.parse(xhr.responseText || "{}");
    if (xhr.status !== 200) return setStatus("dl", 0, data.error || "Error al subir", true);
    pollJob(data.id);
  };
  xhr.send(form);
});

async function pollJob(id) {
  for (;;) {
    const job = await api(`/api/jobs/${id}`);
    setStatus("dl", job.progress || 0, job.message, job.status === "error");
    if (job.status === "ready") return loadJob(job);
    if (job.status === "error") return;
    await sleep(1000);
  }
}

function loadJob(job) {
  state.job = job; state.clips = []; state.markIn = state.markOut = null;
  $("#title").textContent = `2. ${job.title}`;
  player.src = `/media/${job.id}/${job.file}`;
  $("#editor").classList.remove("hidden");
  $("#clips-card").classList.remove("hidden");
  $("#hl-info").textContent = job.heatmap.length
    ? "✔ Este video tiene datos de “Lo más visto”."
    : "Este video no tiene “Lo más visto”; se usará la intensidad del audio.";
  resetExport(); renderClips();
}

// ------------------------------------------------------------ línea de tiempo
function drawTimeline() {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const dur = state.job?.duration;
  if (!dur) return;
  const x = (t) => (t / dur) * w;

  // "Lo más visto"
  const hm = state.job.heatmap;
  if (hm.length) {
    ctx.fillStyle = "rgba(255,176,32,.25)";
    ctx.beginPath(); ctx.moveTo(0, h);
    hm.forEach((p) => ctx.lineTo(x((p.start_time + p.end_time) / 2), h - p.value * (h - 10)));
    ctx.lineTo(w, h); ctx.fill();
  }
  // capítulos
  ctx.fillStyle = "rgba(255,255,255,.25)";
  state.job.chapters.forEach((c) => ctx.fillRect(x(c.start_time), 0, 1, h));
  // clips
  state.clips.forEach((c, i) => {
    ctx.fillStyle = c.end - c.start > MAX_CLIP ? "rgba(255,0,0,.7)" : i % 2 ? "rgba(255,59,92,.35)" : "rgba(255,59,92,.55)";
    ctx.fillRect(x(c.start), 14, Math.max(2, x(c.end) - x(c.start)), h - 28);
  });
  // marcas in/out
  if (state.markIn != null) {
    const end = state.markOut ?? player.currentTime;
    ctx.fillStyle = "rgba(46,204,113,.35)";
    ctx.fillRect(x(state.markIn), 0, Math.max(2, x(end) - x(state.markIn)), h);
  }
  // cabezal
  ctx.fillStyle = "#fff";
  ctx.fillRect(x(player.currentTime) - 1, 0, 2, h);
}
canvas.addEventListener("click", (e) => {
  if (!state.job) return;
  const r = canvas.getBoundingClientRect();
  player.currentTime = ((e.clientX - r.left) / r.width) * state.job.duration;
});
(function loop() { drawTimeline(); requestAnimationFrame(loop); })();

// ------------------------------------------------------------ marcas manuales
function updateInOut() {
  const len = state.markIn != null && state.markOut != null ? ` (${fmt(state.markOut - state.markIn)})` : "";
  $("#in-out").textContent = `${fmt(state.markIn)} → ${fmt(state.markOut)}${len}`;
}
function markIn() { state.markIn = player.currentTime; if (state.markOut != null && state.markOut <= state.markIn) state.markOut = null; updateInOut(); }
function markOut() { state.markOut = player.currentTime; updateInOut(); }
function addMarked() {
  let { markIn: s, markOut: e } = state;
  if (s == null) return alert("Marca primero el inicio (I).");
  if (e == null) e = player.currentTime;
  if (e <= s) return alert("El fin debe ser posterior al inicio.");
  if (e - s > MAX_CLIP) { e = s + MAX_CLIP; alert("El clip se recortó a 10 minutos."); }
  addClips([{ start: s, end: e, name: `clip_${state.clips.length + 1}` }]);
  state.markIn = state.markOut = null; updateInOut();
}
$("#mark-in").onclick = markIn;
$("#mark-out").onclick = markOut;
$("#add-clip").onclick = addMarked;
document.addEventListener("keydown", (e) => {
  if (!state.job || ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if (k === "i") markIn();
  else if (k === "o") markOut();
  else if (k === "a") addMarked();
  else if (k === " ") { e.preventDefault(); player.paused ? player.play() : player.pause(); }
  else if (k === "arrowleft") player.currentTime -= e.shiftKey ? 1 : 5;
  else if (k === "arrowright") player.currentTime += e.shiftKey ? 1 : 5;
});

// ------------------------------------------------------------ pestañas
document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x === t));
  $("#pane-split").classList.toggle("hidden", t.dataset.tab !== "split");
  $("#pane-hl").classList.toggle("hidden", t.dataset.tab !== "hl");
}));

// ------------------------------------------------------------ dividir en partes
$("#do-split").onclick = () => {
  const dur = state.job.duration;
  const max = Math.min(10, Math.max(1, parseFloat($("#split-min").value) || 10)) * 60;
  const n = Math.ceil(dur / max);
  const size = $("#split-equal").checked ? dur / n : max;
  const parts = [];
  for (let i = 0; i < n; i++) {
    parts.push({ start: i * size, end: Math.min(dur, (i + 1) * size), name: `parte_${i + 1}` });
  }
  if (state.clips.length && !confirm("¿Reemplazar los clips actuales?")) return;
  state.clips = []; addClips(parts);
};

// ------------------------------------------------------------ highlights
$("#do-hl").onclick = async (e) => {
  const btn = e.target; btn.disabled = true;
  $("#hl-info").textContent = "Analizando…";
  try {
    const data = await api(`/api/jobs/${state.job.id}/highlights`, {
      count: +$("#hl-count").value, length: +$("#hl-len").value, source: $("#hl-source").value,
    });
    if (state.clips.length && !confirm("¿Reemplazar los clips actuales?")) return;
    state.clips = []; addClips(data.clips);
    $("#hl-info").textContent = `${data.clips.length} highlights según: ${data.source}. Revísalos y ajusta los tiempos si hace falta.`;
  } catch (err) {
    $("#hl-info").textContent = err.message;
  } finally { btn.disabled = false; }
};

// ------------------------------------------------------------ lista de clips
function addClips(list) {
  state.clips.push(...list.map((c) => ({ start: +c.start, end: +c.end, name: c.name })));
  state.clips.sort((a, b) => a.start - b.start);
  renderClips();
}

function renderClips() {
  const tbody = $("#clips tbody");
  tbody.innerHTML = "";
  state.clips.forEach((c, i) => {
    const tr = document.createElement("tr");
    const len = c.end - c.start;
    tr.className = len > MAX_CLIP || len <= 0 ? "bad" : "";
    tr.innerHTML = `
      <td class="n">${i + 1}</td>
      <td class="name"><input value="" aria-label="Nombre"></td>
      <td class="t"><input value="${fmt(c.start)}" aria-label="Inicio"></td>
      <td class="t"><input value="${fmt(c.end)}" aria-label="Fin"></td>
      <td class="d mono">${fmt(len)}</td>
      <td class="actions">
        <button class="icon" title="Previsualizar">▶</button>
        <button class="icon" title="Usar posición actual como inicio">⟦</button>
        <button class="icon" title="Usar posición actual como fin">⟧</button>
        <button class="icon" title="Eliminar">🗑</button>
      </td>`;
    const [nameIn, startIn, endIn] = tr.querySelectorAll("input");
    nameIn.value = c.name;
    nameIn.onchange = () => (c.name = nameIn.value);
    const setTime = (key, input) => {
      const t = parseTime(input.value);
      if (isNaN(t)) { input.value = fmt(c[key]); return; }
      c[key] = Math.min(Math.max(0, t), state.job.duration); renderClips();
    };
    startIn.onchange = () => setTime("start", startIn);
    endIn.onchange = () => setTime("end", endIn);
    const [play, setIn, setOut, del] = tr.querySelectorAll("button");
    play.onclick = () => { player.currentTime = c.start; state.previewEnd = c.end; player.play(); };
    setIn.onclick = () => { c.start = player.currentTime; renderClips(); };
    setOut.onclick = () => { c.end = player.currentTime; renderClips(); };
    del.onclick = () => { state.clips.splice(i, 1); renderClips(); };
    tbody.appendChild(tr);
  });
  $("#clip-count").textContent = state.clips.length;
}
player.addEventListener("timeupdate", () => {
  if (state.previewEnd != null && player.currentTime >= state.previewEnd) { player.pause(); state.previewEnd = null; }
});
player.addEventListener("seeking", () => {
  if (state.previewEnd != null && player.currentTime > state.previewEnd) state.previewEnd = null;
});
$("#clear").onclick = () => { if (confirm("¿Borrar todos los clips?")) { state.clips = []; renderClips(); } };

// ------------------------------------------------------------ exportar
function resetExport() {
  $("#exp-status").classList.add("hidden");
  $("#results").innerHTML = "";
  $("#zip").classList.add("hidden");
}

$("#export").onclick = async (e) => {
  const bad = state.clips.findIndex((c) => c.end - c.start > MAX_CLIP || c.end - c.start < 0.5);
  if (!state.clips.length) return alert("Agrega al menos un clip.");
  if (bad >= 0) return alert(`El clip ${bad + 1} debe durar entre 0.5 s y 10 minutos.`);
  const btn = e.target; btn.disabled = true; resetExport();
  try {
    const { id } = await api(`/api/jobs/${state.job.id}/export`, {
      clips: state.clips, vertical: $("#fmt").value === "vertical", precise: $("#precise").value === "1",
    });
    let shown = 0;
    for (;;) {
      const exp = await api(`/api/exports/${id}`);
      setStatus("exp", exp.progress, exp.message, exp.status === "error");
      for (; shown < exp.files.length; shown++) {
        const f = exp.files[shown];
        const li = document.createElement("li");
        li.innerHTML = `<span class="mono"></span><a download>Descargar</a>`;
        li.querySelector("span").textContent = f.name;
        li.querySelector("a").href = f.url;
        $("#results").appendChild(li);
      }
      if (exp.status === "done") {
        $("#zip").href = `/api/exports/${id}/zip`;
        $("#zip").classList.remove("hidden");
        break;
      }
      if (exp.status === "error") break;
      await sleep(1000);
    }
  } catch (err) {
    setStatus("exp", 0, err.message, true);
  } finally { btn.disabled = false; }
};
