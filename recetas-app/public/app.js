import { RECETAS_BASE } from "./recetas-base.js";
import { tecnicaPara, tipDelDia, saludo, FRASES_EXTRAYENDO, ANIMOS, reaccionDiario, consejosPara } from "./chef.js";

const GOALS = {
  rico: { label: "Comer rico", short: "comer rico", emoji: "😋", blurb: "Lo más sabroso primero" },
  bajar: { label: "Bajar de peso", short: "bajar de peso", emoji: "🥗", blurb: "Ligero, saciante, alto en proteína" },
  subir: { label: "Subir de peso", short: "subir de peso", emoji: "💪", blurb: "Calorías y proteína para ganar masa" },
};
const CATEGORY_ORDER = [
  "Frutas y verduras", "Carnes y pescados", "Lácteos y huevo", "Panadería y tortillas",
  "Granos y pastas", "Enlatados y conservas", "Especias y condimentos", "Aceites y salsas",
  "Congelados", "Otros",
];
const CATEGORY_EMOJI = {
  "Frutas y verduras": "🥕", "Carnes y pescados": "🥩", "Lácteos y huevo": "🥚", "Panadería y tortillas": "🫓",
  "Granos y pastas": "🌾", "Enlatados y conservas": "🥫", "Especias y condimentos": "🌶️", "Aceites y salsas": "🫒",
  "Congelados": "🧊", "Otros": "🛍️",
};
const COUNTRIES = [
  "México", "Argentina", "Chile", "Colombia", "Perú", "Venezuela", "Ecuador", "Uruguay",
  "Guatemala", "Costa Rica", "República Dominicana", "España", "Estados Unidos",
];

// ---------- State (persisted per device) ----------
const STORE_KEY = "recetario-super-v1";
const state = load();

function load() {
  const defaults = {
    nombre: "", chefName: "Canela", onboarded: false,
    mias: [], goal: "rico", country: "México", seleccion: {}, lista: null,
    favoritos: [], diario: [],
  };
  try {
    const { chat, ...saved } = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    return { ...defaults, ...saved };
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
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const chef = () => state.chefName || "Canela";
const stepText = (p) => (typeof p === "string" ? p : p?.texto ?? "");

let aiEnabled = false;
let currentView = "hoy";

// ---------- Small helpers ----------
const scoreOf = (r) => r.calificaciones?.[state.goal]?.score ?? 0;
const scoreClass = (n) => (n >= 8 ? "good" : n >= 5 ? "mid" : "low");
const isFav = (id) => state.favoritos.includes(id);

function fmtQty(n) {
  if (!n) return "";
  const r = Math.round(n * 100) / 100;
  const fractions = { 0.25: "¼", 0.5: "½", 0.75: "¾", 0.33: "⅓", 0.67: "⅔" };
  const whole = Math.floor(r);
  const frac = fractions[Math.round((r - whole) * 100) / 100];
  if (frac) return whole ? `${whole} ${frac}` : frac;
  return String(Math.round(r * 10) / 10);
}

// At the store you buy whole items, so round countable units up.
const COUNTABLE = /^(pieza|piezas|lata|latas|diente|dientes|manojo|manojos|rama|ramas|paquete|paquetes|sobre|sobres|frasco|botella|bolsa|unidad|unidades)$/i;
function shopQty(i) {
  if (COUNTABLE.test((i.unidad || "").trim())) return Math.ceil(i.cantidad - 0.05);
  if (/^(g|ml)$/i.test(i.unidad || "") && i.cantidad > 50) return Math.round(i.cantidad / 10) * 10;
  return i.cantidad;
}

const EMOJI_HINTS = [
  [/taco|pastor|burrito|quesadilla/i, "🌮"], [/pasta|espagueti|fettuc|lasa/i, "🍝"], [/ensalada/i, "🥗"],
  [/sopa|caldo|crema de|lenteja|pozole/i, "🍲"], [/pollo/i, "🍗"], [/salm[oó]n|pescado|at[uú]n|camar/i, "🐟"],
  [/hamburgues/i, "🍔"], [/pizza/i, "🍕"], [/licuado|smoothie|batido/i, "🥤"], [/avena|bowl|granola/i, "🥣"],
  [/huevo|omelet|chilaquil/i, "🍳"], [/pan|hot ?cake|panqu|waffle/i, "🥞"], [/pastel|galleta|brownie|postre|flan/i, "🍰"],
  [/arroz|sushi/i, "🍚"], [/carne|res|bistec|steak/i, "🥩"],
];
function emojiFor(r) {
  if (r.emoji) return r.emoji;
  return EMOJI_HINTS.find(([re]) => re.test(r.titulo))?.[1] ?? "🍽️";
}
function tintFor(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `tint-${(h % 6) + 1}`;
}

function toast(msg, { emoji = chefEmoji(), ms = 3200 } = {}) {
  const t = $("#toast");
  t.innerHTML = `<span class="toast-face">${emoji}</span><span>${esc(msg)}</span>`;
  t.hidden = false;
  t.classList.remove("show");
  void t.offsetWidth;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => (t.hidden = true), 300);
  }, ms);
}
const chefEmoji = () => "👩‍🍳";

function haptic(ms = 12) {
  navigator.vibrate?.(ms);
}

function confetti() {
  if (reduceMotion) return;
  const c = $("#confetti");
  const ctx = c.getContext("2d");
  c.width = innerWidth * devicePixelRatio;
  c.height = innerHeight * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  const styles = getComputedStyle(document.documentElement);
  const colors = ["--terracotta", "--sage", "--butter", "--blush", "--plum"].map((v) => styles.getPropertyValue(v).trim());
  const bits = Array.from({ length: 120 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 120,
    y: innerHeight * 0.55,
    vx: (Math.random() - 0.5) * 12,
    vy: -Math.random() * 14 - 6,
    r: Math.random() * 6 + 4,
    a: Math.random() * Math.PI,
    va: (Math.random() - 0.5) * 0.3,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
  const start = performance.now();
  (function frame(now) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const b of bits) {
      b.vy += 0.35;
      b.x += b.vx;
      b.y += b.vy;
      b.a += b.va;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.a);
      ctx.fillStyle = b.color;
      ctx.fillRect(-b.r / 2, -b.r / 4, b.r, b.r / 2);
      ctx.restore();
    }
    if (now - start < 2600) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, innerWidth, innerHeight);
  })(start);
}

function withTransition(fn) {
  if (document.startViewTransition && !reduceMotion) document.startViewTransition(fn);
  else fn();
}

// Sheets slide up from the bottom; closing animates before the dialog closes.
function openSheet(d, html) {
  d.innerHTML = html;
  d.classList.remove("closing");
  if (!d.open) d.showModal();
  $$("[data-close]", d).forEach((b) => b.addEventListener("click", () => closeSheet(d)));
}
function closeSheet(d) {
  if (!d.open) return;
  if (reduceMotion) return d.close();
  d.classList.add("closing");
  setTimeout(() => {
    d.close();
    d.classList.remove("closing");
  }, 220);
}
for (const d of $$("dialog.sheet")) {
  d.addEventListener("click", (e) => {
    if (e.target === d && !d.dataset.locked) closeSheet(d);
  });
  d.addEventListener("cancel", (e) => {
    e.preventDefault();
    if (!d.dataset.locked) closeSheet(d);
  });
}
const sheetHead = (title, sub = "") => `
  <div class="sheet-grip" aria-hidden="true"></div>
  <header class="sheet-head">
    <div><h2>${title}</h2>${sub ? `<p class="sheet-sub">${sub}</p>` : ""}</div>
    <button class="icon-btn" data-close type="button" aria-label="Cerrar">✕</button>
  </header>`;

const bubble = (text, { small = false } = {}) => `
  <div class="bubble-row ${small ? "small" : ""}">
    <span class="avatar" aria-hidden="true">👩‍🍳</span>
    <p class="bubble">${text}</p>
  </div>`;

function ring(score, size = 56) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  const off = c * (1 - (score || 0) / 10);
  return `<svg class="ring ${scoreClass(score)}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-label="${score} de 10">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bg" />
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c}" style="--off:${off}" />
    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle">${score ?? "–"}</text>
  </svg>`;
}

// ---------- Navigation ----------
const RENDER = { hoy: renderHoy, recetario: renderRecetario, super: renderSuper, diario: renderDiario, perfil: renderPerfil };

function show(view) {
  withTransition(() => {
    currentView = view;
    document.body.dataset.view = view;
    $$(".view").forEach((v) => (v.hidden = v.id !== `view-${view}`));
    $$(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
    RENDER[view]();
    window.scrollTo({ top: 0 });
  });
}
$$(".tabs button").forEach((b) => b.addEventListener("click", () => show(b.dataset.view)));
document.addEventListener("click", (e) => {
  const go = e.target.closest("[data-go]");
  if (go) show(go.dataset.go);
});
$("#goal-chip").addEventListener("click", () => show("perfil"));
$("#chef-fab").addEventListener("click", () => openTip());

function renderGoalChip() {
  const g = GOALS[state.goal];
  $("#goal-chip").innerHTML = `<span>${g.emoji}</span> ${g.label}`;
  document.documentElement.dataset.goal = state.goal;
}

// ---------- Hoy ----------
function renderHoy() {
  const top = allRecipes().sort((a, b) => scoreOf(b) - scoreOf(a)).slice(0, 6);
  const lista = state.lista;
  const listDone = lista ? lista.items.filter((i) => i.estado === "listo" || i.estado === "sustituido").length : 0;
  const stats = diaryStats();
  const last = state.diario[0];

  $("#view-hoy").innerHTML = `
    <div class="hero paper">
      <p class="hello">${esc(saludo(state.nombre))} ✨</p>
      ${bubble(`<b>Tip de ${esc(chef())}:</b> ${esc(tipDelDia())}`)}
    </div>

    <div class="quick">
      <button class="quick-btn q1" data-action="add" type="button"><span>🔗</span>Guardar receta de un link</button>
      <button class="quick-btn q2" data-go="super" type="button"><span>🧺</span>Armar mi súper</button>
      <button class="quick-btn q3" data-go="recetario" type="button"><span>🍳</span>¿Qué cocino hoy?</button>
      <button class="quick-btn q4" data-action="tip" type="button"><span>💡</span>Un consejo de ${esc(chef())}</button>
    </div>

    ${
      lista && lista.items.length
        ? `<button class="card-link paper" data-go="super" type="button">
            <span class="big-emoji">🧺</span>
            <span><b>Tu súper va al ${Math.round((listDone / lista.items.length) * 100)}%</b><br><small>${lista.items.length - listDone} cosas por encontrar</small></span>
            <span class="mini-progress"><span style="width:${(listDone / lista.items.length) * 100}%"></span></span>
          </button>`
        : ""
    }

    <h2 class="section-title">Hoy te recomiendo <span class="hand">para ${esc(GOALS[state.goal].short)}</span></h2>
    <div class="carousel">${top.map((r, i) => recipeCard(r, i, "mini")).join("")}</div>

    <h2 class="section-title">Tu diario <span class="hand">de cocina</span></h2>
    ${
      last
        ? `<div class="diary-peek paper" data-go="diario">
            <div class="stats-row">
              <div><b>${stats.total}</b><small>platillos</small></div>
              <div><b>${stats.racha}</b><small>${stats.racha === 1 ? "día seguido" : "días seguidos"}</small></div>
              <div><b>${stats.promedio}</b><small>estrellas promedio</small></div>
            </div>
            <p class="hand peek-note">Lo último: ${esc(last.emoji)} ${esc(last.titulo)} — ${"★".repeat(last.estrellas)}</p>
          </div>`
        : bubble(`Aquí vamos a ir guardando todo lo que cocines juntas. ¡Elige una receta y dale a <b>Cocinar conmigo</b>! 💛`)
    }
  `;
  bindCards($("#view-hoy"));
  $$("[data-action=add]", $("#view-hoy")).forEach((b) => b.addEventListener("click", openAdd));
  $$("[data-action=tip]", $("#view-hoy")).forEach((b) => b.addEventListener("click", () => openTip()));
}

// ---------- Recetario ----------
let filter = "todas";
let query = "";

function recipeCard(r, i, variant = "") {
  const c = r.calificaciones?.[state.goal];
  return `<article class="rcard ${variant}" data-id="${esc(r.id)}" style="--i:${i}" tabindex="0" role="button" aria-label="${esc(r.titulo)}">
    <div class="rcard-art ${tintFor(r.id)}">
      <span class="art-emoji">${emojiFor(r)}</span>
      ${r.origen === "mia" ? '<span class="tape">mía</span>' : ""}
      <span class="badge ${scoreClass(c?.score ?? 0)}">${c?.score ?? "–"}<small>/10</small></span>
      <button class="heart ${isFav(r.id) ? "on" : ""}" data-fav="${esc(r.id)}" type="button" aria-label="Favorita" aria-pressed="${isFav(r.id)}">♥</button>
    </div>
    <div class="rcard-body">
      <h3>${esc(r.titulo)}</h3>
      <p class="meta">⏱ ${r.tiempo_min} min · ${Math.round(r.nutricion?.kcal ?? 0)} kcal</p>
      ${variant === "mini" ? "" : `<p class="why">${esc(c?.razon ?? "")}</p>`}
    </div>
  </article>`;
}

function bindCards(root) {
  $$(".rcard", root).forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-fav]")) return;
      openRecipe(el.dataset.id);
    });
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") openRecipe(el.dataset.id);
    });
  });
  $$("[data-fav]", root).forEach((b) =>
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFav(b.dataset.fav);
      b.classList.toggle("on", isFav(b.dataset.fav));
      b.setAttribute("aria-pressed", isFav(b.dataset.fav));
      b.classList.remove("pop");
      void b.offsetWidth;
      b.classList.add("pop");
    }),
  );
}

function toggleFav(id) {
  haptic();
  if (isFav(id)) state.favoritos = state.favoritos.filter((x) => x !== id);
  else {
    state.favoritos.push(id);
    toast("¡Guardada en tus favoritas! 💛");
  }
  save();
}

function renderRecetario() {
  $("#view-recetario").innerHTML = `
    <div class="page-head">
      <h1 class="page-title">Mi recetario</h1>
      <button class="btn primary" id="add-btn" type="button">＋ Guardar de un link</button>
    </div>
    <div class="search-wrap">
      <span aria-hidden="true">🔎</span>
      <input id="search" type="search" placeholder="Busca por platillo o ingrediente…" value="${esc(query)}" />
    </div>
    <div class="chips-row" role="tablist">
      ${[["todas", "Todas"], ["fav", "♥ Favoritas"], ["mia", "Mías"], ["app", "Del app"]]
        .map(([k, l]) => `<button class="chip ${filter === k ? "active" : ""}" data-filter="${k}" type="button">${l}</button>`)
        .join("")}
    </div>
    <p class="hand hint-hand">Ordenadas por qué tan pro son para ${esc(GOALS[state.goal].short)} ${GOALS[state.goal].emoji}</p>
    <div class="grid" id="recipe-grid"></div>`;

  $("#add-btn").addEventListener("click", openAdd);
  $("#search").addEventListener("input", (e) => {
    query = e.target.value;
    renderGrid();
  });
  $$("[data-filter]").forEach((b) =>
    b.addEventListener("click", () => {
      filter = b.dataset.filter;
      $$("[data-filter]").forEach((x) => x.classList.toggle("active", x === b));
      renderGrid();
    }),
  );
  renderGrid();
}

function renderGrid() {
  const q = query.trim().toLowerCase();
  const list = allRecipes()
    .filter((r) => filter === "todas" || (filter === "fav" ? isFav(r.id) : r.origen === filter))
    .filter((r) => !q || r.titulo.toLowerCase().includes(q) || r.ingredientes.some((i) => i.nombre.toLowerCase().includes(q)))
    .sort((a, b) => scoreOf(b) - scoreOf(a));
  const grid = $("#recipe-grid");
  if (!list.length) {
    grid.innerHTML = bubble(
      filter === "fav"
        ? "Todavía no tienes favoritas. Toca el ♥ de las recetas que más te gusten."
        : filter === "mia"
          ? "Aún no guardas recetas tuyas. ¿Viste algo rico en Instagram o TikTok? ¡Pásame el link!"
          : "No encontré nada con eso. ¿Probamos con otro ingrediente?",
    );
    return;
  }
  grid.innerHTML = list.map((r, i) => recipeCard(r, i)).join("");
  bindCards(grid);
}

// ---------- Recipe detail ----------
function openRecipe(id, servings) {
  const r = findRecipe(id);
  if (!r) return;
  const d = $("#sheet");
  const porciones = servings ?? state.seleccion[r.id] ?? r.porciones;
  const factor = porciones / (r.porciones || 1);
  const n = r.nutricion ?? {};
  const selected = Boolean(state.seleccion[r.id]);
  const cooked = state.diario.filter((e) => e.recetaId === r.id).length;

  openSheet(
    d,
    `<div class="sheet-grip" aria-hidden="true"></div>
    <header class="sheet-head"><span></span><button class="icon-btn" data-close type="button" aria-label="Cerrar">✕</button></header>
    <div class="sheet-body recipe">
      <div class="recipe-hero ${tintFor(r.id)}">
        <span class="hero-emoji">${emojiFor(r)}</span>
        <button class="heart big ${isFav(r.id) ? "on" : ""}" data-fav="${esc(r.id)}" type="button" aria-label="Favorita">♥</button>
      </div>
      <h2 class="recipe-title">${esc(r.titulo)}</h2>
      <p class="recipe-desc">${esc(r.descripcion)}</p>
      <p class="meta">⏱ ${r.tiempo_min} min · ${esc(r.dificultad)}${cooked ? ` · 📔 la has cocinado ${cooked} ${cooked === 1 ? "vez" : "veces"}` : ""}
        ${r.sourceUrl ? ` · <a href="${esc(r.sourceUrl)}" target="_blank" rel="noopener">Ver original${r.author ? ` de ${esc(r.author)}` : ""}</a>` : ""}</p>
      ${r.inferida ? bubble("El post no traía la receta completa, así que la completé con la versión más clásica. Revísala por si algo no cuadra 😉", { small: true }) : ""}

      <div class="actions-row">
        <button class="btn primary grow" id="cook-btn" type="button">👩‍🍳 Cocinar conmigo</button>
        <button class="btn ${selected ? "sage" : "ghost"}" id="toggle-select" type="button">${selected ? "✓ En mi súper" : "🧺 Al súper"}</button>
      </div>

      <h3 class="block-title">¿Qué tan pro es para ti?</h3>
      <div class="goal-scores">
        ${Object.entries(GOALS)
          .map(([k, g]) => {
            const c = r.calificaciones?.[k] ?? {};
            return `<details class="goal-score ${k === state.goal ? "current" : ""}" ${k === state.goal ? "open" : ""}>
              <summary>${ring(c.score)}<span><b>${g.emoji} ${g.label}</b><small>${esc(c.razon)}</small></span></summary>
              <p class="hand tip-hand">💡 ${esc(c.tip)}</p>
            </details>`;
          })
          .join("")}
      </div>
      <p class="macros"><span><b>${Math.round(n.kcal ?? 0)}</b> kcal</span><span><b>${Math.round(n.proteina_g ?? 0)}g</b> proteína</span><span><b>${Math.round(n.carbohidratos_g ?? 0)}g</b> carbos</span><span><b>${Math.round(n.grasa_g ?? 0)}g</b> grasa</span><span><b>${Math.round(n.fibra_g ?? 0)}g</b> fibra</span></p>
      <p class="fine">Por porción, aproximado.</p>

      <div class="block-head">
        <h3 class="block-title">Ingredientes</h3>
        <div class="stepper" aria-label="Porciones">
          <button type="button" data-serv="-1" aria-label="Menos porciones">−</button>
          <span><b>${porciones}</b> porc.</span>
          <button type="button" data-serv="1" aria-label="Más porciones">+</button>
        </div>
      </div>
      <ul class="ing-list">${r.ingredientes
        .map(
          (i, idx) => `<li><label><input type="checkbox" data-ing="${idx}" /><span><b>${fmtQty(i.cantidad * factor)} ${esc(i.unidad)}</b> ${esc(i.nombre)}${i.nota ? ` <small>· ${esc(i.nota)}</small>` : ""}</span></label></li>`,
        )
        .join("")}</ul>
      <p class="fine">Palomea lo que ya tienes en casa.</p>

      ${
        r.secretos?.length
          ? `<div class="secrets paper">
              <h3 class="hand secrets-title">Secretos de ${esc(chef())} 🤫</h3>
              <ul>${r.secretos.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
            </div>`
          : ""
      }

      <h3 class="block-title">Preparación</h3>
      <ol class="steps">${r.pasos.map((p) => `<li>${esc(stepText(p))}</li>`).join("")}</ol>

      <div class="actions-col">
        <button class="btn ghost" id="ask-btn" type="button">💡 Dame un consejo para esta receta</button>
        <button class="btn ghost" id="log-btn" type="button">📔 Ya la cociné, anotarla en mi diario</button>
        ${r.origen === "mia" ? '<button class="btn ghost danger" id="delete-recipe" type="button">Borrar receta</button>' : ""}
      </div>
    </div>`,
  );

  $$("[data-serv]", d).forEach((b) =>
    b.addEventListener("click", () => {
      const next = Math.max(1, porciones + Number(b.dataset.serv));
      if (state.seleccion[r.id]) {
        state.seleccion[r.id] = next;
        save();
      }
      haptic(8);
      const top = $(".sheet-body", d).scrollTop;
      openRecipe(id, next);
      $(".sheet-body", d).scrollTop = top;
    }),
  );
  $("[data-fav]", d).addEventListener("click", (e) => {
    toggleFav(r.id);
    e.currentTarget.classList.toggle("on", isFav(r.id));
    if (currentView !== "super") RENDER[currentView]();
  });
  $("#toggle-select", d).addEventListener("click", (e) => {
    haptic();
    if (state.seleccion[r.id]) {
      delete state.seleccion[r.id];
      e.currentTarget.className = "btn ghost";
      e.currentTarget.textContent = "🧺 Al súper";
    } else {
      state.seleccion[r.id] = porciones;
      e.currentTarget.className = "btn sage";
      e.currentTarget.textContent = "✓ En mi súper";
      toast(`Anotada para tu próxima compra (${porciones} porc.) 🧺`);
    }
    save();
  });
  $("#cook-btn", d).addEventListener("click", () => {
    closeSheet(d);
    startCooking(r, porciones);
  });
  $("#ask-btn", d).addEventListener("click", () => openTip(r));
  $("#log-btn", d).addEventListener("click", () => openDiaryForm(r));
  $("#delete-recipe", d)?.addEventListener("click", () => {
    if (!confirm("¿Borrar esta receta de tu recetario?")) return;
    state.mias = state.mias.filter((x) => x.id !== r.id);
    state.favoritos = state.favoritos.filter((x) => x !== r.id);
    delete state.seleccion[r.id];
    save();
    closeSheet(d);
    RENDER[currentView]();
  });
}

// ---------- Add from link ----------
function openAdd(prefill = "") {
  const d = $("#sheet");
  openSheet(
    d,
    `${sheetHead("Guardar una receta", "De Instagram, TikTok o YouTube")}
    <div class="sheet-body">
      ${bubble("Pásame el link del video y yo te saco la receta completa, con cantidades, pasos y mis secretos. 😉")}
      ${aiEnabled ? "" : `<p class="notice">Para leer links necesito que configuren la IA en el servidor (<code>ANTHROPIC_API_KEY</code>). Mientras, puedes usar las recetas del recetario.</p>`}
      <form id="extract-form" class="stack">
        <label class="field">Link
          <input id="extract-url" type="url" inputmode="url" placeholder="https://www.instagram.com/reel/…" value="${esc(typeof prefill === "string" ? prefill : "")}" />
        </label>
        <details class="soft">
          <summary>¿El post no trae la receta? Pega el caption o lo que dicen en el video</summary>
          <textarea id="extract-text" rows="5" placeholder="Ingredientes: 2 huevos, 1 taza de avena…"></textarea>
        </details>
        <button class="btn primary" type="submit" id="extract-btn">✨ Sacar receta</button>
      </form>
      <div id="extract-status" hidden></div>
    </div>`,
  );
  $("#extract-form", d).addEventListener("submit", extract);
  if (prefill && aiEnabled) $("#extract-form", d).requestSubmit();
}

async function extract(e) {
  e.preventDefault();
  const url = $("#extract-url").value.trim();
  const text = $("#extract-text").value.trim();
  const status = $("#extract-status");
  if (!url && !text) {
    status.hidden = false;
    status.innerHTML = bubble("Necesito un link o el texto de la receta para ayudarte. 🙂", { small: true });
    return;
  }
  const btn = $("#extract-btn");
  btn.disabled = true;
  status.hidden = false;
  let k = 0;
  const paint = () => (status.innerHTML = `<div class="working">${bubble(`${esc(FRASES_EXTRAYENDO[k % FRASES_EXTRAYENDO.length])} <span class="dots"><i></i><i></i><i></i></span>`)}</div>`);
  paint();
  const ticker = setInterval(() => {
    k++;
    paint();
  }, 2200);
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
    clearInterval(ticker);
    confetti();
    toast(`¡Lista! “${recipe.titulo}” ya está en tu recetario.`);
    RENDER[currentView]();
    openRecipe(recipe.id);
  } catch (err) {
    clearInterval(ticker);
    status.innerHTML = bubble(`Ay, no pude: ${esc(err.message)} Intenta pegar el texto de la receta abajo y lo armo con eso.`, { small: true });
    btn.disabled = false;
  }
}

// ---------- Cooking mode ----------
const cook = { recipe: null, porciones: 0, idx: 0, timers: [], wake: null };

function parseMinutes(text) {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(?:(?:a|-|–)\s*(\d+(?:[.,]\d+)?)\s*)?(minutos?|min\b|horas?|hrs?\b)/i);
  if (!m) return null;
  const n = parseFloat((m[2] ?? m[1]).replace(",", "."));
  return /h/i.test(m[3]) ? n * 60 : n;
}

async function startCooking(r, porciones) {
  cook.recipe = r;
  cook.porciones = porciones;
  cook.idx = -1;
  const d = $("#cook");
  if (!d.open) d.showModal();
  try {
    cook.wake = await navigator.wakeLock?.request("screen");
  } catch {
    cook.wake = null;
  }
  renderCook();
}

function stopCooking() {
  cook.timers.forEach((t) => clearInterval(t.handle));
  cook.timers = [];
  cook.wake?.release?.().catch(() => {});
  cook.wake = null;
  $("#cook").close();
}

function renderCook(dir = 0) {
  const r = cook.recipe;
  const d = $("#cook");
  const total = r.pasos.length;
  const i = cook.idx;
  let body;

  if (i < 0) {
    const factor = cook.porciones / (r.porciones || 1);
    body = `
      <div class="cook-card">
        <p class="cook-kicker">Antes de empezar</p>
        <h2 class="cook-title">Ten todo a la mano ${emojiFor(r)}</h2>
        ${bubble("Los chefs le dicen <i>mise en place</i>: todo picado y medido antes de prender la estufa. ¡Así nada se quema mientras buscas algo!", { small: true })}
        <ul class="ing-list cook-ing">${r.ingredientes
          .map((ing) => `<li><label><input type="checkbox" /><span><b>${fmtQty(ing.cantidad * factor)} ${esc(ing.unidad)}</b> ${esc(ing.nombre)}</span></label></li>`)
          .join("")}</ul>
      </div>`;
  } else if (i >= total) {
    body = `
      <div class="cook-card done">
        <p class="cook-kicker">¡Terminaste!</p>
        <h2 class="cook-title">¿Cómo te quedó? ${emojiFor(r)}</h2>
        ${diaryFormHtml()}
      </div>`;
  } else {
    const text = stepText(r.pasos[i]);
    const mins = parseMinutes(text);
    const tip = tecnicaPara(text);
    body = `
      <div class="cook-card">
        <p class="cook-kicker">Paso ${i + 1} de ${total}</p>
        <p class="cook-step">${esc(text)}</p>
        ${mins ? `<button class="btn butter timer-start" data-mins="${mins}" type="button">⏲️ Poner temporizador de ${fmtQty(mins)} min</button>` : ""}
        ${tip ? bubble(esc(tip), { small: true }) : ""}
      </div>`;
  }

  const pct = Math.max(0, Math.min(1, (i + 1) / (total + 1)));
  d.innerHTML = `
    <div class="cook-top">
      <button class="icon-btn" id="cook-close" type="button" aria-label="Salir del modo cocina">✕</button>
      <div class="cook-progress"><span style="width:${pct * 100}%"></span></div>
      <span class="cook-count">${Math.max(0, Math.min(i + 1, total))}/${total}</span>
    </div>
    <div class="cook-timers" id="cook-timers"></div>
    <div class="cook-stage ${dir > 0 ? "from-right" : dir < 0 ? "from-left" : ""}">${body}</div>
    ${
      i >= total
        ? ""
        : `<div class="cook-nav">
            <button class="btn ghost" id="cook-prev" type="button" ${i < 0 ? "disabled" : ""}>← Atrás</button>
            <button class="btn primary grow" id="cook-next" type="button">${i < 0 ? "¡Empezamos! →" : i === total - 1 ? "¡Listo! 🎉" : "Siguiente →"}</button>
          </div>`
    }`;

  renderTimers();
  $("#cook-close").addEventListener("click", () => {
    if (cook.idx >= 0 && cook.idx < total && !confirm("¿Salir del modo cocina?")) return;
    stopCooking();
  });
  $("#cook-prev")?.addEventListener("click", () => step(-1));
  $("#cook-next")?.addEventListener("click", () => step(1));
  $(".timer-start", d)?.addEventListener("click", (e) => addTimer(Number(e.currentTarget.dataset.mins), i + 1));
  if (i >= total) bindDiaryForm(d, r, () => stopCooking());

  // Swipe between steps with a finger (hands busy? the buttons are big too).
  const stage = $(".cook-stage", d);
  let x0 = null;
  stage.addEventListener("pointerdown", (e) => (x0 = e.clientX));
  stage.addEventListener("pointerup", (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 60 && cook.idx < total) step(dx < 0 ? 1 : -1);
  });
}

function step(dir) {
  const total = cook.recipe.pasos.length;
  const next = cook.idx + dir;
  if (next < -1 || next > total) return;
  haptic(8);
  cook.idx = next;
  if (next === total) confetti();
  renderCook(dir);
}
$("#cook").addEventListener("cancel", (e) => {
  e.preventDefault();
  stopCooking();
});
document.addEventListener("keydown", (e) => {
  if (!$("#cook").open || cook.idx >= cook.recipe?.pasos.length) return;
  if (e.target.matches("input, textarea")) return;
  if (e.key === "ArrowRight") step(1);
  if (e.key === "ArrowLeft") step(-1);
});

function addTimer(mins, paso) {
  const t = { id: Date.now(), paso, end: Date.now() + mins * 60000, total: mins * 60000, done: false };
  t.handle = setInterval(() => {
    if (!t.done && Date.now() >= t.end) {
      t.done = true;
      ding();
      navigator.vibrate?.([300, 120, 300, 120, 300]);
      toast(`¡Ya está el temporizador del paso ${paso}! ⏰`, { ms: 6000 });
    }
    renderTimers();
  }, 500);
  cook.timers.push(t);
  haptic();
  toast(`Te aviso en ${fmtQty(mins)} min. Mientras, puedes seguir con lo demás. 😉`);
  renderTimers();
}

function renderTimers() {
  const el = $("#cook-timers");
  if (!el) return;
  el.innerHTML = cook.timers
    .map((t) => {
      const left = Math.max(0, t.end - Date.now());
      const mm = String(Math.floor(left / 60000)).padStart(2, "0");
      const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
      return `<button class="timer ${t.done ? "ring-now" : ""}" data-timer="${t.id}" type="button" title="Toca para quitar">
        <span class="timer-fill" style="width:${(1 - left / t.total) * 100}%"></span>
        <span>⏲️ Paso ${t.paso} · ${t.done ? "¡Listo!" : `${mm}:${ss}`}</span></button>`;
    })
    .join("");
  $$("[data-timer]", el).forEach((b) =>
    b.addEventListener("click", () => {
      const t = cook.timers.find((x) => x.id === Number(b.dataset.timer));
      if (!t.done && !confirm("¿Quitar este temporizador?")) return;
      clearInterval(t.handle);
      cook.timers = cook.timers.filter((x) => x !== t);
      renderTimers();
    }),
  );
}

function ding() {
  try {
    const ctx = new AudioContext();
    [0, 0.25, 0.5].forEach((delay) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.25, ctx.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.22);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + delay);
      o.stop(ctx.currentTime + delay + 0.25);
    });
  } catch {
    /* audio not available */
  }
}

// ---------- Diary ----------
function diaryFormHtml() {
  return `
    <div class="diary-form">
      <div class="stars" role="radiogroup" aria-label="Estrellas">
        ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" aria-label="${n} estrellas">★</button>`).join("")}
      </div>
      <div class="moods">${ANIMOS.map((a, i) => `<button type="button" class="mood" data-mood="${i}">${a.emoji}<small>${a.label}</small></button>`).join("")}</div>
      <label class="field">Nota para tu yo del futuro
        <textarea id="diary-note" rows="3" placeholder="Le puse más ajo y quedó increíble…"></textarea>
      </label>
      <button class="btn primary" id="diary-save" type="button" disabled>📔 Guardar en mi diario</button>
    </div>`;
}

function bindDiaryForm(root, r, onDone) {
  let stars = 0;
  let mood = null;
  const saveBtn = $("#diary-save", root);
  $$("[data-star]", root).forEach((b) =>
    b.addEventListener("click", () => {
      stars = Number(b.dataset.star);
      haptic(8);
      $$("[data-star]", root).forEach((x) => x.classList.toggle("on", Number(x.dataset.star) <= stars));
      saveBtn.disabled = false;
    }),
  );
  $$("[data-mood]", root).forEach((b) =>
    b.addEventListener("click", () => {
      mood = Number(b.dataset.mood);
      $$("[data-mood]", root).forEach((x) => x.classList.toggle("on", x === b));
      haptic(8);
    }),
  );
  saveBtn.addEventListener("click", () => {
    state.diario.unshift({
      id: Date.now(),
      recetaId: r.id,
      titulo: r.titulo,
      emoji: emojiFor(r),
      fecha: new Date().toISOString(),
      estrellas: stars,
      animo: mood === null ? null : ANIMOS[mood].emoji,
      nota: $("#diary-note", root).value.trim(),
      score: r.calificaciones?.[state.goal]?.score ?? null,
      objetivo: state.goal,
    });
    save();
    confetti();
    toast(reaccionDiario(stars), { ms: 4500 });
    onDone();
    RENDER[currentView]();
  });
}

function openDiaryForm(r) {
  const d = $("#sheet2");
  openSheet(d, `${sheetHead(`${emojiFor(r)} ${esc(r.titulo)}`, "Anotar en mi diario")}<div class="sheet-body">${diaryFormHtml()}</div>`);
  bindDiaryForm(d, r, () => closeSheet(d));
}

const dayKey = (iso) => new Date(iso).toLocaleDateString("en-CA");
function diaryStats() {
  const total = state.diario.length;
  const promedio = total ? (state.diario.reduce((s, e) => s + e.estrellas, 0) / total).toFixed(1) : "–";
  const days = new Set(state.diario.map((e) => dayKey(e.fecha)));
  let racha = 0;
  const d = new Date();
  if (!days.has(dayKey(d.toISOString()))) d.setDate(d.getDate() - 1);
  while (days.has(dayKey(d.toISOString()))) {
    racha++;
    d.setDate(d.getDate() - 1);
  }
  return { total, promedio, racha };
}

function renderDiario() {
  const stats = diaryStats();
  const byMonth = new Map();
  for (const e of state.diario) {
    const k = new Date(e.fecha).toLocaleDateString("es", { month: "long", year: "numeric" });
    byMonth.set(k, [...(byMonth.get(k) ?? []), e]);
  }
  $("#view-diario").innerHTML = `
    <h1 class="page-title">Mi diario de cocina</h1>
    <p class="hand hint-hand">Todo lo que has cocinado, con tus notas y estrellitas.</p>
    <div class="stats-row big paper">
      <div><b>${stats.total}</b><small>platillos</small></div>
      <div><b>${stats.racha}🔥</b><small>racha de días</small></div>
      <div><b>${stats.promedio}</b><small>estrellas promedio</small></div>
    </div>
    ${
      state.diario.length
        ? [...byMonth.entries()]
            .map(
              ([month, entries]) => `
          <h2 class="month">${esc(month)}</h2>
          <div class="pages">
            ${entries
              .map(
                (e, i) => `
              <article class="page paper" style="--i:${i}" data-recipe="${esc(e.recetaId)}">
                <div class="page-date"><b>${new Date(e.fecha).getDate()}</b><small>${new Date(e.fecha).toLocaleDateString("es", { weekday: "short" })}</small></div>
                <div class="page-body">
                  <h3>${esc(e.emoji)} ${esc(e.titulo)}</h3>
                  <p class="page-stars">${"★".repeat(e.estrellas)}<span>${"★".repeat(5 - e.estrellas)}</span> ${e.animo ?? ""}</p>
                  ${e.nota ? `<p class="hand page-note">“${esc(e.nota)}”</p>` : ""}
                </div>
                <button class="icon-btn small" data-del-entry="${e.id}" type="button" aria-label="Borrar entrada">✕</button>
              </article>`,
              )
              .join("")}
          </div>`,
            )
            .join("")
        : `<div class="empty-diary">${bubble(`Tu diario está esperando su primera página. Cuando cocines conmigo, al final te pregunto cómo te quedó y lo anotamos aquí. 💛`)}
            <button class="btn primary" data-go="recetario" type="button">Elegir qué cocinar</button></div>`
    }`;

  $$(".page[data-recipe]").forEach((p) =>
    p.addEventListener("click", (e) => {
      if (e.target.closest("[data-del-entry]")) return;
      if (findRecipe(p.dataset.recipe)) openRecipe(p.dataset.recipe);
    }),
  );
  $$("[data-del-entry]").forEach((b) =>
    b.addEventListener("click", () => {
      if (!confirm("¿Borrar esta página de tu diario?")) return;
      state.diario = state.diario.filter((e) => e.id !== Number(b.dataset.delEntry));
      save();
      renderDiario();
    }),
  );
}

// ---------- Supermarket ----------
function renderSuper() {
  const hasList = state.lista && state.lista.items.length;
  if (hasList) renderGrocery();
  else renderSelection();
}

function renderSelection() {
  const recipes = allRecipes().sort((a, b) => scoreOf(b) - scoreOf(a));
  const count = Object.keys(state.seleccion).length;
  $("#view-super").innerHTML = `
    <h1 class="page-title">¿Qué vas a cocinar?</h1>
    ${bubble(count ? `Llevas <b>${count}</b> ${count === 1 ? "receta" : "recetas"}. Ajusta las porciones y te armo la lista por pasillos. 🧺` : "Elige las recetas que quieres hacer esta semana y yo te armo la lista del súper, sumando lo repetido.")}
    <ul class="select-list">
      ${recipes
        .map((r, i) => {
          const on = Boolean(state.seleccion[r.id]);
          const c = r.calificaciones?.[state.goal]?.score ?? 0;
          return `<li class="${on ? "on" : ""}" data-id="${esc(r.id)}" style="--i:${i}">
            <label>
              <input type="checkbox" ${on ? "checked" : ""} />
              <span class="sel-art ${tintFor(r.id)}">${emojiFor(r)}</span>
              <span class="title">${esc(r.titulo)}<small>${GOALS[state.goal].emoji} ${c}/10 · ${r.tiempo_min} min</small></span>
            </label>
            ${
              on
                ? `<div class="stepper">
                    <button type="button" data-d="-1" aria-label="Menos porciones">−</button>
                    <span><b>${state.seleccion[r.id]}</b> porc.</span>
                    <button type="button" data-d="1" aria-label="Más porciones">+</button>
                  </div>`
                : ""
            }
          </li>`;
        })
        .join("")}
    </ul>
    <div class="sticky-cta">
      <button class="btn primary block" id="build-list" type="button" ${count ? "" : "disabled"}>🧺 Armar mi lista (${count})</button>
    </div>`;

  $$(".select-list li").forEach((li) => {
    const id = li.dataset.id;
    $("input", li).addEventListener("change", (e) => {
      haptic(8);
      if (e.target.checked) state.seleccion[id] = findRecipe(id).porciones;
      else delete state.seleccion[id];
      save();
      const y = scrollY;
      renderSelection();
      scrollTo({ top: y });
    });
    $$(".stepper button", li).forEach((b) =>
      b.addEventListener("click", () => {
        state.seleccion[id] = Math.max(1, (state.seleccion[id] ?? 1) + Number(b.dataset.d));
        save();
        const y = scrollY;
        renderSelection();
        scrollTo({ top: y });
      }),
    );
  });
  $("#build-list").addEventListener("click", buildList);
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
  withTransition(renderSuper);
  toast(`¡Lista hecha! ${state.lista.items.length} cosas, ordenadas por pasillo. 🧺`);
}

function listAsText() {
  const groups = groupByCategory(state.lista.items.filter((i) => i.estado !== "listo"));
  return `🧺 Lista del súper\n\n${groups
    .map(([cat, items]) => `${CATEGORY_EMOJI[cat] ?? ""} ${cat}\n${items.map((i) => `- ${fmtQty(shopQty(i))} ${i.unidad} ${i.sustituto ?? i.nombre}`).join("\n")}`)
    .join("\n\n")}`;
}

function groupByCategory(items) {
  const groups = new Map();
  for (const it of items) groups.set(it.categoria, [...(groups.get(it.categoria) ?? []), it]);
  return [...groups.entries()].sort((a, b) => CATEGORY_ORDER.indexOf(a[0]) - CATEGORY_ORDER.indexOf(b[0]));
}

function superMood(done, total, missing) {
  const left = total - done;
  if (left === 0) return "¡Terminaste el súper! Eres una máquina. Ahora sí, ¡a cocinar! 🎉";
  if (missing) return `Si algo no lo encuentras, toca “No lo encuentro” y te digo cómo se llama aquí o con qué cambiarlo.`;
  if (done === 0) return "Vamos pasillo por pasillo. Palomea lo que vayas echando al carrito. 🛒";
  if (left <= 3) return `¡Ya casi! Solo te faltan ${left}. 💪`;
  return `Vas muy bien: ${done} de ${total}. ¡Sigue así!`;
}

function renderGrocery() {
  const items = state.lista.items;
  const done = items.filter((i) => i.estado === "listo" || i.estado === "sustituido").length;
  const missing = items.filter((i) => i.estado === "nohay").length;
  const pct = (done / items.length) * 100;

  $("#view-super").innerHTML = `
    <div class="page-head">
      <h1 class="page-title">Mi lista del súper</h1>
      <button class="btn ghost small" id="edit-selection" type="button">Cambiar recetas</button>
    </div>
    <div class="basket paper">
      <div class="basket-top"><b>${done}</b> de ${items.length} en el carrito${missing ? ` · <span class="warn">${missing} sin encontrar</span>` : ""}</div>
      <div class="progress"><span style="width:${pct}%"></span></div>
    </div>
    ${bubble(superMood(done, items.length, missing), { small: true })}
    <div id="grocery">
      ${groupByCategory(items)
        .map(
          ([cat, its]) => `<section class="aisle">
            <h3 class="aisle-title"><span>${CATEGORY_EMOJI[cat] ?? "🛍️"}</span> ${esc(cat)}</h3>
            <ul class="grocery lined">${its
              .map(
                (i) => `<li class="${i.estado}" data-key="${esc(i.key)}">
                  <label><input type="checkbox" ${i.estado === "listo" || i.estado === "sustituido" ? "checked" : ""} />
                    <span class="g-text"><b>${fmtQty(shopQty(i))} ${esc(i.unidad)}</b> ${i.sustituto ? `<s>${esc(i.nombre)}</s> → <em>${esc(i.sustituto)}</em>` : esc(i.nombre)}
                    <small>${esc(i.recetas.join(" · "))}</small></span></label>
                  <button type="button" class="missing-btn" aria-label="No lo encuentro">${i.estado === "nohay" ? "Ver opciones" : "¿No está?"}</button>
                </li>`,
              )
              .join("")}</ul></section>`,
        )
        .join("")}
    </div>
    <div class="actions-row">
      <button class="btn ghost grow" id="share-list" type="button">📤 Compartir lista</button>
      <button class="btn sage grow" id="clear-list" type="button">✓ Terminé mi compra</button>
    </div>`;

  $$("#grocery li").forEach((li) => {
    const item = items.find((x) => x.key === li.dataset.key);
    $("input", li).addEventListener("change", (e) => {
      haptic(10);
      item.estado = e.target.checked ? (item.sustituto ? "sustituido" : "listo") : "pendiente";
      save();
      li.classList.add("just-checked");
      setTimeout(() => {
        const y = scrollY;
        renderGrocery();
        scrollTo({ top: y });
        const nowDone = items.every((x) => x.estado === "listo" || x.estado === "sustituido");
        if (nowDone && e.target.checked) confetti();
      }, 260);
    });
    $(".missing-btn", li).addEventListener("click", () => openAlternatives(item));
  });
  $("#edit-selection").addEventListener("click", () => {
    state.lista = null;
    save();
    withTransition(renderSuper);
  });
  $("#clear-list").addEventListener("click", () => {
    if (!confirm("¿Terminaste la compra? Se borrará la lista.")) return;
    state.lista = null;
    state.seleccion = {};
    save();
    confetti();
    toast("¡Súper hecho! Ahora la parte divertida: cocinar. 👩‍🍳");
    withTransition(renderSuper);
  });
  $("#share-list").addEventListener("click", async () => {
    const text = listAsText();
    try {
      if (navigator.share) await navigator.share({ title: "Lista del súper", text });
      else {
        await navigator.clipboard.writeText(text);
        toast("Lista copiada. ¡Pégala donde quieras! 📋");
      }
    } catch {
      /* user cancelled the share sheet */
    }
  });
}

async function openAlternatives(item) {
  const d = $("#sheet2");
  if (item.estado !== "listo") item.estado = "nohay";
  save();
  renderGrocery();
  openSheet(
    d,
    `${sheetHead(`No encuentro: ${esc(item.nombre)}`, `Para ${esc(item.recetas.join(", "))}`)}
    <div class="sheet-body" id="alt-body">${bubble(`Déjame ver cómo se llama en ${esc(state.country)} y con qué lo podemos cambiar… <span class="dots"><i></i><i></i><i></i></span>`)}</div>`,
  );

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
    $("#alt-body").innerHTML = bubble(`Uy, no pude buscarlo: ${esc(err.message || "sin conexión")}`);
    return;
  }

  $("#alt-body").innerHTML = `
    ${data.offline ? `<p class="notice">Respuesta básica sin IA. Con la IA activa te doy alternativas para cada receta.</p>` : ""}
    <h3 class="block-title">🔎 Búscalo como</h3>
    <ul class="chips-row wrap">${data.nombres_locales.map((n, i) => `<li class="chip ${i === 0 ? "active" : ""}">${esc(n)}</li>`).join("")}</ul>
    <div class="label-card paper">
      <p><b>🏷️ En la etiqueta debe decir:</b><br>${esc(data.que_dice_la_etiqueta)}</p>
      <p><b>📍 Pasillo:</b> ${esc(data.pasillo)}</p>
    </div>
    <h3 class="block-title">🔁 Lo puedes cambiar por</h3>
    ${
      data.alternativas.length
        ? `<ul class="alts">${data.alternativas
            .map(
              (a, idx) => `<li style="--i:${idx}">
                <div><b>${esc(a.nombre)}</b> ${a.mejor_para_objetivo ? `<span class="tag good">${GOALS[state.goal].emoji} mejor para ${esc(GOALS[state.goal].short)}</span>` : ""}
                <small>${esc(a.proporcion)} · ${esc(a.nota)}</small></div>
                <button type="button" class="btn primary small" data-idx="${idx}">Usar</button>
              </li>`,
            )
            .join("")}</ul>`
        : bubble("Para este no tengo un buen sustituto. Pregunta en el área, ¡a veces está escondido! 🙈", { small: true })
    }
    <div class="actions-row">
      <button type="button" class="btn sage grow" id="found-it">¡Ya lo encontré!</button>
      <button type="button" class="btn ghost grow" id="skip-it">Lo omito</button>
    </div>`;

  $$(".alts button", d).forEach((b) =>
    b.addEventListener("click", () => {
      item.sustituto = data.alternativas[Number(b.dataset.idx)].nombre;
      item.estado = "pendiente";
      done(`Listo, cambié ${item.nombre} por ${item.sustituto}. 👌`);
    }),
  );
  $("#found-it", d).addEventListener("click", () => {
    item.sustituto = null;
    item.estado = "listo";
    done("¡Bien! A veces está donde menos lo esperas. 🙌");
  });
  $("#skip-it", d).addEventListener("click", () => {
    item.estado = "listo";
    item.sustituto = null;
    done("Sin problema, la receta sale igual de rica. 😉");
  });

  function done(msg) {
    save();
    closeSheet(d);
    renderGrocery();
    toast(msg);
  }
}

// ---------- Chef tips (local, no AI credits) ----------
function openTip(recipe = null) {
  const d = $("#sheet2");
  const tips = consejosPara({ view: currentView, recipe, goal: state.goal });
  let k = Math.floor(Math.random() * tips.length);
  const paint = () => {
    openSheet(
      d,
      `${sheetHead(`Un consejo de ${esc(chef())}`, recipe ? `Para: ${emojiFor(recipe)} ${esc(recipe.titulo)}` : "")}
      <div class="sheet-body">
        ${bubble(esc(tips[k % tips.length]))}
        <div class="actions-row">
          <button class="btn ghost grow" id="tip-next" type="button">🔁 Otro consejo</button>
          <button class="btn primary grow" data-close type="button">¡Gracias! 💛</button>
        </div>
      </div>`,
    );
    $("#tip-next", d).addEventListener("click", () => {
      k++;
      haptic(8);
      paint();
    });
  };
  paint();
}

// ---------- Perfil ----------
function renderPerfil() {
  $("#view-perfil").innerHTML = `
    <h1 class="page-title">Tú y tu cocina</h1>
    <label class="field">¿Cómo te llamo?
      <input id="p-name" value="${esc(state.nombre)}" placeholder="Tu nombre" />
    </label>
    <label class="field">Tu amiga chef se llama
      <input id="p-chef" value="${esc(state.chefName)}" placeholder="Canela" />
    </label>
    <h2 class="section-title">Tu objetivo</h2>
    <div class="goals">${goalOptions()}</div>
    <label class="field">¿En qué país compras?
      <select id="p-country">${COUNTRIES.map((c) => `<option ${c === state.country ? "selected" : ""}>${c}</option>`).join("")}</select>
    </label>
    <p class="fine">Así te digo cómo se llama cada producto en tu súper. Tus recetas, diario y lista se guardan solo en este dispositivo.</p>`;

  $("#p-name").addEventListener("change", (e) => {
    state.nombre = e.target.value.trim();
    save();
  });
  $("#p-chef").addEventListener("change", (e) => {
    state.chefName = e.target.value.trim() || "Canela";
    save();
  });
  $("#p-country").addEventListener("change", (e) => {
    state.country = e.target.value;
    save();
  });
  bindGoalOptions($("#view-perfil"), () => toast(goalReaction()));
}

function goalOptions() {
  return Object.entries(GOALS)
    .map(
      ([k, g]) => `<label class="goal g-${k}"><input type="radio" name="goal" value="${k}" ${state.goal === k ? "checked" : ""} />
        <span><i>${g.emoji}</i><b>${g.label}</b><small>${g.blurb}</small></span></label>`,
    )
    .join("");
}
function bindGoalOptions(root, after) {
  $$('input[name="goal"]', root).forEach((r) =>
    r.addEventListener("change", () => {
      state.goal = r.value;
      save();
      haptic();
      renderGoalChip();
      after?.();
    }),
  );
}
function goalReaction() {
  return {
    rico: "¡Me encanta! Vamos a comer delicioso, sin culpas. 😋",
    bajar: "¡Vamos! Platillos que llenan, ricos y ligeros. Sin dietas tristes. 🥗",
    subir: "¡A ganar masa! Te voy a enseñar a comer más, y mejor. 💪",
  }[state.goal];
}

// ---------- Onboarding ----------
function onboarding() {
  const d = $("#sheet");
  d.dataset.locked = "1";
  let stepN = 0;
  const steps = [
    () => `
      <div class="onb">
        <div class="onb-face">👩‍🍳</div>
        <h2 class="hand onb-title">¡Hola! Soy ${esc(chef())}</h2>
        <p>Voy a ser tu amiga chef. Te ayudo a guardar las recetas que ves en redes, a hacer el súper y a cocinar cada vez más rico y más sano.</p>
        <label class="field">¿Cómo te llamo?
          <input id="onb-name" placeholder="Tu nombre" value="${esc(state.nombre)}" autocomplete="given-name" />
        </label>
        <button class="btn primary block" id="onb-next" type="button">Mucho gusto →</button>
      </div>`,
    () => `
      <div class="onb">
        ${bubble(`¡Qué bonito nombre, ${esc(state.nombre || "amiga")}! Cuéntame, ¿qué quieres lograr con tu comida?`)}
        <div class="goals">${goalOptions()}</div>
        <button class="btn primary block" id="onb-next" type="button">Siguiente →</button>
      </div>`,
    () => `
      <div class="onb">
        ${bubble("Última: ¿en qué país haces el súper? Así te digo cómo se llama cada cosa ahí.")}
        <select id="onb-country">${COUNTRIES.map((c) => `<option ${c === state.country ? "selected" : ""}>${c}</option>`).join("")}</select>
        <button class="btn primary block" id="onb-next" type="button">¡A cocinar! 🎉</button>
      </div>`,
  ];
  const paint = () => {
    openSheet(d, `<div class="sheet-grip" aria-hidden="true"></div><div class="sheet-body">${steps[stepN]()}<div class="dots-nav">${steps.map((_, i) => `<i class="${i === stepN ? "on" : ""}"></i>`).join("")}</div></div>`);
    bindGoalOptions(d);
    $("#onb-next", d).addEventListener("click", () => {
      if (stepN === 0) state.nombre = $("#onb-name").value.trim();
      if (stepN === 2) state.country = $("#onb-country").value;
      save();
      if (stepN < steps.length - 1) {
        stepN++;
        paint();
      } else {
        state.onboarded = true;
        save();
        delete d.dataset.locked;
        closeSheet(d);
        confetti();
        renderGoalChip();
        show("hoy");
        toast(goalReaction());
      }
    });
  };
  paint();
}

// ---------- Boot ----------
async function boot() {
  renderGoalChip();
  try {
    const s = await fetch("/api/status").then((r) => r.json());
    aiEnabled = s.ai;
  } catch {
    aiEnabled = false;
  }

  // Web Share Target: links shared from Instagram/TikTok/YouTube arrive as query params.
  const params = new URLSearchParams(location.search);
  const shared = params.get("url") || params.get("text") || params.get("title") || "";
  const sharedUrl = shared.match(/https?:\/\/\S+/)?.[0];

  show("hoy");
  if (sharedUrl) {
    history.replaceState(null, "", location.pathname);
    openAdd(sharedUrl);
  } else if (!state.onboarded) {
    onboarding();
  }

  // The chef button hides its label after a moment so it doesn't get in the way.
  setTimeout(() => $("#chef-fab").classList.add("compact"), 4000);

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
}
boot();
