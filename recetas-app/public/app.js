import { RECETAS_BASE } from "./recetas-base.js";

const GOALS = {
  rico: { label: "Comer rico", emoji: "😋" },
  bajar: { label: "Bajar de peso", emoji: "🥗" },
  subir: { label: "Subir de peso", emoji: "💪" },
};
const CATEGORY_ORDER = [
  "Frutas y verduras", "Carnes y pescados", "Lácteos y huevo", "Panadería y tortillas",
  "Granos y pastas", "Enlatados y conservas", "Especias y condimentos", "Aceites y salsas",
  "Congelados", "Otros",
];

// ---------- State (persisted per device) ----------
const STORE_KEY = "recetario-super-v1";
const state = load();

function load() {
  const defaults = { mias: [], goal: "rico", country: "México", seleccion: {}, lista: null };
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(STORE_KEY) || "{}") };
  } catch {
    return defaults;
  }
}
function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable: the app still works for this session */
  }
}

const allRecipes = () => [...state.mias, ...RECETAS_BASE];
const findRecipe = (id) => allRecipes().find((r) => r.id === id);
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

let aiEnabled = false;

// ---------- Navigation ----------
function show(view) {
  document.querySelectorAll(".view").forEach((v) => (v.hidden = v.id !== `view-${view}`));
  document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  if (view === "recetas") renderRecipes();
  if (view === "super") renderSuper();
  window.scrollTo(0, 0);
}
document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => show(b.dataset.view)));
$("#goal-chip").addEventListener("click", () => show("perfil"));

// ---------- Goal & country ----------
function renderGoal() {
  const g = GOALS[state.goal];
  $("#goal-chip").textContent = `${g.emoji} ${g.label}`;
  document.querySelectorAll('input[name="goal"]').forEach((r) => (r.checked = r.value === state.goal));
  $("#country").value = state.country;
}
document.querySelectorAll('input[name="goal"]').forEach((r) =>
  r.addEventListener("change", () => {
    state.goal = r.value;
    save();
    renderGoal();
  }),
);
$("#country").addEventListener("change", (e) => {
  state.country = e.target.value;
  save();
});

// ---------- Recipe list ----------
let filter = "todas";
document.querySelectorAll("#filter button").forEach((b) =>
  b.addEventListener("click", () => {
    filter = b.dataset.filter;
    document.querySelectorAll("#filter button").forEach((x) => x.classList.toggle("active", x === b));
    renderRecipes();
  }),
);
$("#search").addEventListener("input", renderRecipes);

const scoreOf = (r) => r.calificaciones?.[state.goal]?.score ?? 0;
const scoreClass = (n) => (n >= 8 ? "good" : n >= 5 ? "mid" : "low");

function renderRecipes() {
  const q = $("#search").value.trim().toLowerCase();
  const list = allRecipes()
    .filter((r) => filter === "todas" || r.origen === filter)
    .filter((r) => !q || r.titulo.toLowerCase().includes(q) || r.ingredientes.some((i) => i.nombre.toLowerCase().includes(q)))
    .sort((a, b) => scoreOf(b) - scoreOf(a));

  $("#rank-hint").textContent = `Ordenadas por qué tan pro son para: ${GOALS[state.goal].label.toLowerCase()}.`;
  $("#recipe-list").innerHTML =
    list
      .map((r) => {
        const c = r.calificaciones?.[state.goal];
        return `<li class="card" data-id="${esc(r.id)}">
          <div class="score ${scoreClass(c?.score ?? 0)}" title="Calificación para tu objetivo">${c?.score ?? "–"}<small>/10</small></div>
          <div class="card-body">
            <h3>${esc(r.titulo)}</h3>
            <p class="meta">${r.origen === "mia" ? `<span class="tag mine">${esc(platformLabel(r.platform))}</span>` : '<span class="tag">Del app</span>'}
              ⏱ ${r.tiempo_min} min · ${r.porciones} porc. · ${Math.round(r.nutricion?.kcal ?? 0)} kcal</p>
            <p class="why">${esc(c?.razon ?? "")}</p>
          </div>
        </li>`;
      })
      .join("") || '<li class="empty">No hay recetas aquí todavía. Agrega una desde un link ➕</li>';

  document.querySelectorAll("#recipe-list .card").forEach((el) => el.addEventListener("click", () => openRecipe(el.dataset.id)));
}

function platformLabel(p) {
  return { instagram: "Instagram", youtube: "YouTube", tiktok: "TikTok", web: "Web", texto: "Mía" }[p] ?? "Mía";
}

function fmtQty(n) {
  if (!n) return "";
  const r = Math.round(n * 100) / 100;
  const fractions = { 0.25: "¼", 0.5: "½", 0.75: "¾", 0.33: "⅓", 0.67: "⅔" };
  const whole = Math.floor(r);
  const frac = fractions[Math.round((r - whole) * 100) / 100];
  if (frac) return whole ? `${whole} ${frac}` : frac;
  return String(r);
}

// At the store you buy whole items, so round countable units up.
const COUNTABLE = /^(pieza|piezas|lata|latas|diente|dientes|manojo|manojos|rama|ramas|paquete|paquetes|sobre|sobres|frasco|botella|bolsa|unidad|unidades)$/i;
function shopQty(i) {
  if (COUNTABLE.test((i.unidad || "").trim())) return Math.ceil(i.cantidad - 0.05);
  if (/^(g|ml)$/i.test(i.unidad || "") && i.cantidad > 50) return Math.round(i.cantidad / 10) * 10;
  return i.cantidad;
}

// ---------- Recipe detail ----------
function openRecipe(id) {
  const r = findRecipe(id);
  if (!r) return;
  const d = $("#recipe-dialog");
  const n = r.nutricion ?? {};
  const selected = Boolean(state.seleccion[r.id]);
  d.innerHTML = `
    <form method="dialog" class="dialog-head"><h2>${esc(r.titulo)}</h2><button class="icon" aria-label="Cerrar">✕</button></form>
    <div class="dialog-body">
      ${r.inferida ? '<p class="notice">El post no traía la receta completa; se completó con la versión más común del platillo. Revísala.</p>' : ""}
      <p>${esc(r.descripcion)}</p>
      <p class="meta">⏱ ${r.tiempo_min} min · ${r.porciones} porciones · ${esc(r.dificultad)}
        ${r.sourceUrl ? ` · <a href="${esc(r.sourceUrl)}" target="_blank" rel="noopener">Ver original${r.author ? ` (${esc(r.author)})` : ""}</a>` : ""}</p>
      <div class="scores">
        ${Object.entries(GOALS)
          .map(([k, g]) => {
            const c = r.calificaciones?.[k] ?? {};
            return `<div class="score-row ${k === state.goal ? "current" : ""}">
              <div class="score ${scoreClass(c.score ?? 0)}">${c.score ?? "–"}</div>
              <div><b>${g.emoji} ${g.label}</b><br><span>${esc(c.razon)}</span><br><small>💡 ${esc(c.tip)}</small></div>
            </div>`;
          })
          .join("")}
      </div>
      <p class="macros">Por porción (aprox.): <b>${Math.round(n.kcal ?? 0)}</b> kcal · P ${Math.round(n.proteina_g ?? 0)} g · C ${Math.round(n.carbohidratos_g ?? 0)} g · G ${Math.round(n.grasa_g ?? 0)} g · Fibra ${Math.round(n.fibra_g ?? 0)} g</p>
      <h3>Ingredientes</h3>
      <ul class="ingredients">${r.ingredientes
        .map((i) => `<li><b>${fmtQty(i.cantidad)} ${esc(i.unidad)}</b> ${esc(i.nombre)}${i.nota ? ` <small>(${esc(i.nota)})</small>` : ""}</li>`)
        .join("")}</ul>
      <h3>Preparación</h3>
      <ol class="steps">${r.pasos.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>
      <div class="row sticky-actions">
        <button class="primary" id="toggle-select" type="button">${selected ? "✓ En mi próxima compra" : "🛒 Agregar a mi compra"}</button>
        ${r.origen === "mia" ? '<button class="ghost danger" id="delete-recipe" type="button">Borrar</button>' : ""}
      </div>
    </div>`;
  d.querySelector("#toggle-select").addEventListener("click", () => {
    if (state.seleccion[r.id]) delete state.seleccion[r.id];
    else state.seleccion[r.id] = r.porciones;
    save();
    openRecipe(id);
  });
  d.querySelector("#delete-recipe")?.addEventListener("click", () => {
    if (!confirm("¿Borrar esta receta?")) return;
    state.mias = state.mias.filter((x) => x.id !== r.id);
    delete state.seleccion[r.id];
    save();
    d.close();
    renderRecipes();
  });
  if (!d.open) d.showModal();
}

// ---------- Extract from link ----------
$("#extract-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = $("#extract-url").value.trim();
  const text = $("#extract-text").value.trim();
  if (!url && !text) return setStatus("Pega un link o el texto de la receta.", "error");
  const btn = $("#extract-btn");
  btn.disabled = true;
  setStatus("Leyendo el post y armando la receta… (puede tardar unos segundos)", "loading");
  try {
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url, text }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo sacar la receta.");
    const recipe = { ...data.recipe, id: `mia-${Date.now()}`, origen: "mia" };
    state.mias.unshift(recipe);
    save();
    $("#extract-url").value = "";
    $("#extract-text").value = "";
    setStatus(`Listo: “${recipe.titulo}” guardada.`, "ok");
    openRecipe(recipe.id);
  } catch (err) {
    setStatus(err.message, "error");
  } finally {
    btn.disabled = false;
  }
});

function setStatus(msg, kind) {
  const el = $("#extract-status");
  el.hidden = false;
  el.className = `status ${kind}`;
  el.textContent = msg;
}

// ---------- Supermarket ----------
function renderSuper() {
  const hasList = state.lista && state.lista.items.length;
  $("#super-select").hidden = Boolean(hasList);
  $("#super-list").hidden = !hasList;
  if (hasList) renderGrocery();
  else renderSelection();
}

function renderSelection() {
  const recipes = allRecipes().sort((a, b) => scoreOf(b) - scoreOf(a));
  $("#select-list").innerHTML = recipes
    .map((r) => {
      const on = Boolean(state.seleccion[r.id]);
      const c = r.calificaciones?.[state.goal]?.score ?? 0;
      return `<li class="${on ? "on" : ""}" data-id="${esc(r.id)}">
        <label><input type="checkbox" ${on ? "checked" : ""} />
          <span class="score sm ${scoreClass(c)}">${c}</span>
          <span class="title">${esc(r.titulo)}</span></label>
        <div class="servings" ${on ? "" : "hidden"}>
          <button type="button" data-d="-1" aria-label="Menos porciones">−</button>
          <span>${state.seleccion[r.id] ?? r.porciones} porc.</span>
          <button type="button" data-d="1" aria-label="Más porciones">+</button>
        </div>
      </li>`;
    })
    .join("");

  document.querySelectorAll("#select-list li").forEach((li) => {
    const id = li.dataset.id;
    li.querySelector("input").addEventListener("change", (e) => {
      if (e.target.checked) state.seleccion[id] = findRecipe(id).porciones;
      else delete state.seleccion[id];
      save();
      renderSelection();
    });
    li.querySelectorAll(".servings button").forEach((b) =>
      b.addEventListener("click", () => {
        state.seleccion[id] = Math.max(1, (state.seleccion[id] ?? 1) + Number(b.dataset.d));
        save();
        renderSelection();
      }),
    );
  });
  $("#build-list").disabled = Object.keys(state.seleccion).length === 0;
}

const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

function buildList() {
  const map = new Map();
  for (const [id, servings] of Object.entries(state.seleccion)) {
    const r = findRecipe(id);
    if (!r) continue;
    const factor = servings / (r.porciones || 1);
    for (const ing of r.ingredientes) {
      const key = `${normalize(ing.nombre)}|${normalize(ing.unidad || "")}`;
      const item = map.get(key) ?? {
        key,
        nombre: ing.nombre,
        unidad: ing.unidad,
        cantidad: 0,
        categoria: CATEGORY_ORDER.includes(ing.categoria) ? ing.categoria : "Otros",
        recetas: [],
        estado: "pendiente", // pendiente | listo | nohay | sustituido
        sustituto: null,
      };
      item.cantidad += (ing.cantidad || 0) * factor;
      if (!item.recetas.includes(r.titulo)) item.recetas.push(r.titulo);
      map.set(key, item);
    }
  }
  state.lista = { creada: Date.now(), items: [...map.values()] };
  save();
  renderSuper();
}
$("#build-list").addEventListener("click", buildList);
$("#edit-selection").addEventListener("click", () => {
  state.lista = null;
  save();
  renderSuper();
});
$("#clear-list").addEventListener("click", () => {
  if (!confirm("¿Terminaste la compra? Se borrará la lista y la selección.")) return;
  state.lista = null;
  state.seleccion = {};
  save();
  renderSuper();
});
$("#share-list").addEventListener("click", async () => {
  const text = listAsText();
  try {
    if (navigator.share) await navigator.share({ title: "Lista del súper", text });
    else {
      await navigator.clipboard.writeText(text);
      alert("Lista copiada al portapapeles.");
    }
  } catch {
    /* user cancelled the share sheet */
  }
});

function listAsText() {
  const groups = groupByCategory(state.lista.items.filter((i) => i.estado !== "listo"));
  return groups
    .map(([cat, items]) => `${cat}\n${items.map((i) => `- ${fmtQty(shopQty(i))} ${i.unidad} ${i.sustituto ?? i.nombre}`).join("\n")}`)
    .join("\n\n");
}

function groupByCategory(items) {
  const groups = new Map();
  for (const it of items) groups.set(it.categoria, [...(groups.get(it.categoria) ?? []), it]);
  return [...groups.entries()].sort((a, b) => CATEGORY_ORDER.indexOf(a[0]) - CATEGORY_ORDER.indexOf(b[0]));
}

function renderGrocery() {
  const items = state.lista.items;
  const done = items.filter((i) => i.estado === "listo" || i.estado === "sustituido").length;
  $("#progress-bar").style.width = `${(done / items.length) * 100}%`;
  const missing = items.filter((i) => i.estado === "nohay").length;
  $("#progress-text").textContent = `${done} de ${items.length} en el carrito${missing ? ` · ${missing} sin encontrar` : ""}`;

  $("#grocery").innerHTML = groupByCategory(items)
    .map(
      ([cat, its]) => `<h3 class="cat">${esc(cat)}</h3><ul class="grocery">${its
        .map(
          (i) => `<li class="${i.estado}" data-key="${esc(i.key)}">
            <label><input type="checkbox" ${i.estado === "listo" || i.estado === "sustituido" ? "checked" : ""} />
              <span><b>${fmtQty(shopQty(i))} ${esc(i.unidad)}</b> ${i.sustituto ? `<s>${esc(i.nombre)}</s> → ${esc(i.sustituto)}` : esc(i.nombre)}
              <small>${esc(i.recetas.join(", "))}</small></span></label>
            <button type="button" class="ghost sm missing-btn">${i.estado === "nohay" ? "Ver opciones" : "No lo encuentro"}</button>
          </li>`,
        )
        .join("")}</ul>`,
    )
    .join("");

  document.querySelectorAll("#grocery li").forEach((li) => {
    const item = items.find((x) => x.key === li.dataset.key);
    li.querySelector("input").addEventListener("change", (e) => {
      item.estado = e.target.checked ? (item.sustituto ? "sustituido" : "listo") : "pendiente";
      save();
      renderGrocery();
    });
    li.querySelector(".missing-btn").addEventListener("click", () => openAlternatives(item));
  });
}

async function openAlternatives(item) {
  const d = $("#alt-dialog");
  item.estado = item.estado === "listo" ? "listo" : "nohay";
  save();
  renderGrocery();
  d.innerHTML = `<form method="dialog" class="dialog-head"><h2>No encuentro: ${esc(item.nombre)}</h2><button class="icon" aria-label="Cerrar">✕</button></form>
    <div class="dialog-body"><p class="status loading">Buscando cómo se llama en ${esc(state.country)} y con qué cambiarlo…</p></div>`;
  if (!d.open) d.showModal();

  let data;
  try {
    const res = await fetch("/api/alternatives", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ product: item.nombre, country: state.country, recipes: item.recetas, goal: state.goal }),
    });
    data = await res.json();
    if (!res.ok) throw new Error(data.error);
  } catch (err) {
    d.querySelector(".dialog-body").innerHTML = `<p class="status error">${esc(err.message || "No se pudo consultar.")}</p>`;
    return;
  }

  d.querySelector(".dialog-body").innerHTML = `
    ${data.offline ? '<p class="notice">Respuesta básica sin IA. Configura la IA para alternativas personalizadas.</p>' : ""}
    <h3>🔎 Búscalo como</h3>
    <ul class="chips">${data.nombres_locales.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
    <p><b>En la etiqueta debe decir:</b> ${esc(data.que_dice_la_etiqueta)}</p>
    <p><b>Pasillo:</b> ${esc(data.pasillo)}</p>
    <h3>🔁 Alternativas</h3>
    ${
      data.alternativas.length
        ? `<ul class="alts">${data.alternativas
            .map(
              (a, idx) => `<li>
                <div><b>${esc(a.nombre)}</b> ${a.mejor_para_objetivo ? `<span class="tag good">Mejor para ${esc(GOALS[state.goal].label.toLowerCase())}</span>` : ""}
                <br><small>${esc(a.proporcion)} · ${esc(a.nota)}</small></div>
                <button type="button" class="primary sm" data-idx="${idx}">Usar</button>
              </li>`,
            )
            .join("")}</ul>`
        : "<p>No tengo sustitutos sugeridos para este producto.</p>"
    }
    <div class="row">
      <button type="button" class="ghost" id="found-it">¡Ya lo encontré!</button>
      <button type="button" class="ghost" id="skip-it">Lo omito</button>
    </div>`;

  d.querySelectorAll(".alts button").forEach((b) =>
    b.addEventListener("click", () => {
      item.sustituto = data.alternativas[Number(b.dataset.idx)].nombre;
      item.estado = "pendiente";
      closeAlt();
    }),
  );
  d.querySelector("#found-it").addEventListener("click", () => {
    item.sustituto = null;
    item.estado = "listo";
    closeAlt();
  });
  d.querySelector("#skip-it").addEventListener("click", () => {
    item.estado = "listo";
    item.sustituto = null;
    closeAlt();
  });

  function closeAlt() {
    save();
    d.close();
    renderGrocery();
  }
}

// ---------- Boot ----------
async function boot() {
  renderGoal();
  try {
    const s = await fetch("/api/status").then((r) => r.json());
    aiEnabled = s.ai;
  } catch {
    aiEnabled = false;
  }
  $("#ai-off").hidden = aiEnabled;

  // Web Share Target: links shared from Instagram/TikTok/YouTube arrive as query params.
  const params = new URLSearchParams(location.search);
  const shared = params.get("url") || params.get("text") || params.get("title") || "";
  const sharedUrl = shared.match(/https?:\/\/\S+/)?.[0];
  if (sharedUrl) {
    history.replaceState(null, "", location.pathname);
    show("agregar");
    $("#extract-url").value = sharedUrl;
    if (aiEnabled) $("#extract-form").requestSubmit();
  } else {
    show("recetas");
  }

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
}
boot();
