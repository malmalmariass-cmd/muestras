// YT Clipper: descarga videos de YouTube y córtalos en highlights o en partes de máx. 10 minutos.
// Servidor Express (compatible con el hosting Node.js de Hostinger, Render, Railway, etc.).

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const archiver = require("archiver");
const express = require("express");
const multer = require("multer");

const { binaries } = require("./scripts/binaries");
const { FEATURES, GENERAL_FAQ, NAV, PAGES, PAGES_BY_SLUG, PLATFORMS, SITE_NAME } = require("./pages");

const DATA_DIR = process.env.YTCLIPPER_DATA || path.join(__dirname, "data");
const MAX_CLIP_SECONDS = 600; // 10 minutos
const QUALITY_FORMATS = {
  720: "bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720][ext=mp4]/bv*[height<=720]+ba/b[height<=720]/bv*+ba/b",
  1080: "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080][ext=mp4]/bv*[height<=1080]+ba/b[height<=1080]/bv*+ba/b",
  best: "bv*+ba/b",
};
const ALLOWED_UPLOAD_EXT = new Set([".mp4", ".mov", ".mkv", ".webm", ".m4v"]);
// URL pública del sitio (p. ej. https://tudominio.com). Se usa en canonical, sitemap y Open Graph.
const SITE_URL = (process.env.SITE_URL || "").replace(/\/+$/, "");
const LAST_UPDATE = process.env.SITE_LAST_UPDATE || new Date().toISOString().slice(0, 10);
const ID_RE = /^[0-9a-f]{32}$/;

/** Huella de todos los archivos estáticos: cambia en cada versión que modifique alguno. */
function staticFingerprint(dir) {
  const hash = crypto.createHash("sha1");
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : hash.update(e.name).update(fs.readFileSync(path.join(d, e.name)))));
  walk(dir);
  return hash.digest("hex").slice(0, 10);
}
const STATIC_VERSION = staticFingerprint(path.join(__dirname, "static"));
const asset = (p) => `/static/v-${STATIC_VERSION}/${p}`;
const EXPORT_ID_RE = /^[0-9a-f]{64}$/; // id del video (32) + id de la exportación (32)
// Si una descarga no avanza en este tiempo, el proceso que la hacía se reinició.
const STALE_MS = 3 * 60 * 1000;

fs.mkdirSync(DATA_DIR, { recursive: true });
const jobs = new Map();
const exports_ = new Map();

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("trust proxy", true);
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

const newId = () => crypto.randomBytes(16).toString("hex");

function jobDir(id) {
  if (!ID_RE.test(id)) return null;
  return path.join(DATA_DIR, id);
}

// ---------------------------------------------------------------- estado en disco
// Hostinger puede reiniciar la app o repartir las peticiones entre varias instancias, así que el
// estado de cada video y exportación se guarda en disco y cualquier instancia puede leerlo.

function writeJson(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file);
}

function readJson(file) {
  try {
    return { data: JSON.parse(fs.readFileSync(file, "utf8")), mtime: fs.statSync(file).mtimeMs };
  } catch {
    return null;
  }
}

const saveJob = (job) => writeJson(path.join(jobDir(job.id), "job.json"), job);
const pendingSaves = new Set();
function saveJobSoon(job) {
  if (pendingSaves.has(job.id)) return;
  pendingSaves.add(job.id);
  setTimeout(() => { pendingSaves.delete(job.id); saveJob(job); }, 1000);
}

function loadJob(id) {
  if (jobs.has(id)) return jobs.get(id);
  const dir = jobDir(id);
  const saved = dir && readJson(path.join(dir, "job.json"));
  if (!saved) return null;
  const job = saved.data;
  if (job.status === "downloading" && Date.now() - saved.mtime > STALE_MS) {
    Object.assign(job, { status: "error", message: "La descarga se interrumpió (el servidor se reinició). Inténtalo de nuevo." });
  }
  return job;
}

function exportFile(exportId) {
  return path.join(DATA_DIR, exportId.slice(0, 32), "clips", exportId.slice(32), "export.json");
}

function loadExport(exportId) {
  if (!EXPORT_ID_RE.test(exportId)) return null;
  if (exports_.has(exportId)) return exports_.get(exportId);
  const saved = readJson(exportFile(exportId));
  if (!saved) return null;
  const exp = saved.data;
  if (exp.status === "working" && Date.now() - saved.mtime > STALE_MS) {
    Object.assign(exp, { status: "error", message: "La exportación se interrumpió (el servidor se reinició). Inténtalo de nuevo." });
  }
  return exp;
}

// ---------------------------------------------------------------- cookies y proxy de YouTube
// YouTube bloquea muchas IP de servidores ("Sign in to confirm you're not a bot"). Con cookies de
// una cuenta de YouTube (archivo cookies.txt) o un proxy residencial, la descarga vuelve a funcionar.

const COOKIE_CANDIDATES = [
  process.env.YTDLP_COOKIES_FILE,
  path.join(os.homedir(), "yt-clipper", "cookies.txt"),
  path.join(os.homedir(), "cookies.txt"),
  path.join(__dirname, "cookies.txt"),
].filter(Boolean);

/** Devuelve la ruta a una copia escribible de las cookies (yt-dlp las actualiza), o null. */
function cookiesFile() {
  const dest = path.join(DATA_DIR, ".cookies.txt");
  let content = null;
  if (process.env.YTDLP_COOKIES) {
    content = process.env.YTDLP_COOKIES.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
  } else {
    const src = COOKIE_CANDIDATES.find((f) => fs.existsSync(f));
    if (!src) return null;
    if (fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(src).mtimeMs) return dest;
    content = fs.readFileSync(src, "utf8");
  }
  fs.writeFileSync(dest, content, { mode: 0o600 });
  return dest;
}

/** Argumentos de yt-dlp para cookies y proxy, si están configurados. */
function ytdlpAccessArgs() {
  const cookies = cookiesFile();
  return [
    ...(cookies ? ["--cookies", cookies] : []),
    ...(process.env.YTDLP_PROXY ? ["--proxy", process.env.YTDLP_PROXY] : []),
  ];
}

function friendlyDownloadError(message) {
  if (/confirm you.?re not a bot|Sign in to confirm/i.test(message)) {
    return "YouTube bloqueó la descarga desde este servidor (pide confirmar que no eres un robot). " +
      "El administrador debe configurar cookies de YouTube o un proxy (ver README). " +
      "Mientras tanto, puedes subir el archivo de video desde tu dispositivo.";
  }
  if (/Private video|Video unavailable|This video is unavailable/i.test(message)) {
    return "El video es privado o no está disponible.";
  }
  if (/Unsupported URL/i.test(message)) return "Ese enlace no es compatible. Pega el enlace directo del video.";
  return message.replace(/^ERROR:\s*/, "");
}

function safeName(name, fallback) {
  const clean = String(name || "").normalize("NFC").replace(/[^\p{L}\p{N}_\-. ]+/gu, "").trim().replace(/ /g, "_");
  return clean.slice(0, 80) || fallback;
}

/** Ejecuta un comando; resuelve con { stdout, stderr } o rechaza con el final de stderr. */
function run(cmd, args, { onStdoutLine, env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], env: env || process.env });
    let stdout = "";
    let stderr = "";
    let buf = "";
    child.stdout.on("data", (d) => {
      const text = d.toString();
      stdout += text;
      if (onStdoutLine) {
        buf += text;
        const lines = buf.split(/\r?\n|\r/);
        buf = lines.pop();
        lines.forEach(onStdoutLine);
      }
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
      if (stderr.length > 20000) stderr = stderr.slice(-10000);
    });
    child.on("error", (err) => reject(err.code === "EACCES"
      ? new Error(`El servidor no permite ejecutar ${path.basename(cmd)} (permiso denegado)`) : err));
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr.trim().split("\n").slice(-3).join("\n") || `${path.basename(cmd)} terminó con código ${code}`));
    });
  });
}

async function probeDuration(file) {
  const { ffprobe } = await binaries(DATA_DIR);
  const { stdout } = await run(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "json", file]);
  return parseFloat(JSON.parse(stdout).format.duration);
}

/** Ejecuta ffmpeg con los argumentos dados. */
async function ffmpeg(args) {
  const bins = await binaries(DATA_DIR);
  return run(bins.ffmpeg, args);
}

// ---------------------------------------------------------------- descarga

async function runDownload(id, url, quality) {
  const job = jobs.get(id);
  const dir = jobDir(id);
  try {
    job.message = "Preparando descargador…";
    saveJobSoon(job);
    const bins = await binaries(DATA_DIR);
    const yt = await bins.ytdlp();
    job.message = "Descargando…";
    await run(yt.cmd, [
      ...yt.pre,
      ...ytdlpAccessArgs(),
      "-f", QUALITY_FORMATS[quality] || QUALITY_FORMATS[1080],
      "--merge-output-format", "mp4",
      "--ffmpeg-location", bins.ffmpeg,
      "-o", path.join(dir, "video.%(ext)s"),
      "--write-info-json", "--no-playlist", "--newline", "--no-warnings",
      url,
    ], {
      env: yt.env,
      onStdoutLine: (line) => {
        const m = line.match(/\[download\]\s+([\d.]+)%(?:.*?at\s+(\S+))?/);
        if (m) {
          job.progress = Math.min(100, parseFloat(m[1]));
          job.message = `Descargando… ${m[2] && m[2] !== "Unknown" ? m[2] : ""}`.trim();
        } else if (/\[Merger\]|\[ffmpeg\]/.test(line)) {
          job.message = "Uniendo audio y video…";
        }
        saveJobSoon(job);
      },
    });

    let file = fs.readdirSync(dir).find((f) => f.startsWith("video.") && !f.endsWith(".json") && !f.endsWith(".part"));
    if (!file) throw new Error("No se encontró el video descargado");
    if (!file.endsWith(".mp4")) {
      await ffmpeg(["-y", "-v", "error", "-i", path.join(dir, file), "-c", "copy", path.join(dir, "video.mp4")]);
      fs.unlinkSync(path.join(dir, file));
      file = "video.mp4";
    }
    const infoFile = path.join(dir, "video.info.json");
    const info = fs.existsSync(infoFile) ? JSON.parse(fs.readFileSync(infoFile, "utf8")) : {};
    if (fs.existsSync(infoFile)) fs.unlinkSync(infoFile);
    Object.assign(job, {
      status: "ready", progress: 100, message: "Listo",
      title: info.title || "video",
      duration: info.duration || (await probeDuration(path.join(dir, file))),
      heatmap: info.heatmap || [],
      chapters: info.chapters || [],
      file,
    });
  } catch (err) {
    Object.assign(job, { status: "error", message: friendlyDownloadError(err.message) });
  }
  saveJob(job);
  jobs.delete(id); // a partir de aquí se lee de disco, igual que en las demás instancias
}

app.post("/api/download", (req, res) => {
  const url = String(req.body.url || "").trim();
  if (!/^https?:\/\//i.test(url)) return res.status(400).json({ error: "Pega un enlace válido (https://…)" });
  const id = newId();
  fs.mkdirSync(jobDir(id));
  const job = { id, status: "downloading", progress: 0, message: "Iniciando…" };
  jobs.set(id, job);
  saveJob(job);
  runDownload(id, url, String(req.body.quality || "1080"));
  res.json({ id });
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      req.jobId = newId();
      const dir = jobDir(req.jobId);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, "upload" + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 4 * 1024 * 1024 * 1024 }, // 4 GB
  fileFilter: (req, file, cb) => cb(null, ALLOWED_UPLOAD_EXT.has(path.extname(file.originalname).toLowerCase())),
});

app.post("/api/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Sube un archivo de video (mp4, mov, mkv, webm)" });
  const id = req.jobId;
  const dir = jobDir(id);
  const out = path.join(dir, "video.mp4");
  try {
    if (path.extname(req.file.path) === ".mp4") {
      fs.renameSync(req.file.path, out);
    } else {
      await ffmpeg(["-y", "-v", "error", "-i", req.file.path, "-c:v", "libx264", "-preset", "veryfast",
        "-c:a", "aac", "-movflags", "+faststart", out]);
      fs.unlinkSync(req.file.path);
    }
    const title = path.parse(Buffer.from(req.file.originalname, "latin1").toString("utf8")).name;
    saveJob({
      id, status: "ready", progress: 100, message: "Listo", title,
      duration: await probeDuration(out), heatmap: [], chapters: [], file: "video.mp4",
    });
    res.json({ id });
  } catch (err) {
    res.status(400).json({ error: `No se pudo leer el video: ${err.message}` });
  }
});

function getJob(req, res) {
  const job = loadJob(req.params.id);
  if (!job) res.status(404).json({ error: "No se encontró el video. Puede que se haya borrado; vuelve a cargarlo." });
  return job;
}

app.get("/api/jobs/:id", (req, res) => {
  const job = getJob(req, res);
  if (job) res.json(job);
});

app.get("/media/:id/*", (req, res) => {
  const dir = jobDir(req.params.id);
  if (!dir) return res.sendStatus(404);
  // sendFile con `root` rechaza rutas con "..", y soporta Range para el reproductor.
  res.sendFile(req.params[0], { root: dir }, (err) => err && !res.headersSent && res.sendStatus(404));
});

// ---------------------------------------------------------------- highlights

/** Volumen RMS (dB) por segundo usando ffmpeg astats. */
async function audioEnergy(file) {
  const { stdout } = await ffmpeg([
    "-v", "error", "-i", file, "-vn", "-af",
    "aresample=8000,asetnsamples=8000,astats=metadata=1:reset=1," +
      "ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-",
    "-f", "null", "-",
  ]);
  return [...stdout.matchAll(/RMS_level=(-?[\d.]+|-inf)/g)].map((m) =>
    m[1] === "-inf" ? -90 : Math.max(parseFloat(m[1]), -90));
}

/** Elige `count` ventanas de `length` s con mayor puntuación sin solaparse. */
function pickPeaks(scores, step, length, count, duration) {
  const win = Math.max(1, Math.round(length / step));
  if (scores.length < win) return [[0, Math.min(length, duration), 1]];
  const sums = [scores.slice(0, win).reduce((a, b) => a + b, 0)];
  for (let i = 1; i <= scores.length - win; i++) sums.push(sums[i - 1] - scores[i - 1] + scores[i + win - 1]);
  const order = sums.map((_, i) => i).sort((a, b) => sums[b] - sums[a]);
  const chosen = [];
  for (const i of order) {
    if (chosen.every((j) => Math.abs(i - j) >= win)) chosen.push(i);
    if (chosen.length === count) break;
  }
  const best = sums[order[0]] || 1;
  return chosen.sort((a, b) => a - b).map((i) => [i * step, Math.min(i * step + length, duration), sums[i] / best]);
}

app.post("/api/jobs/:id/highlights", async (req, res) => {
  const job = getJob(req, res);
  if (!job) return;
  if (job.status !== "ready") return res.status(400).json({ error: "El video aún no está listo" });
  const count = Math.max(1, Math.min(parseInt(req.body.count, 10) || 5, 30));
  const duration = Number(job.duration);
  const length = Math.max(5, Math.min(Number(req.body.length) || 30, MAX_CLIP_SECONDS, duration));

  let scores;
  let source;
  if (job.heatmap.length && req.body.source !== "audio") {
    // "Lo más visto" de YouTube: muestras de ~1 % del video; se re-muestrea a 1 s.
    scores = new Array(Math.ceil(duration)).fill(0);
    for (const h of job.heatmap) {
      for (let s = Math.floor(h.start_time); s < Math.min(Math.ceil(h.end_time), scores.length); s++) scores[s] = h.value;
    }
    source = "Lo más visto de YouTube";
  } else {
    try {
      const rms = await audioEnergy(path.join(jobDir(job.id), job.file));
      const floor = rms.length ? Math.min(...rms) : -90;
      scores = rms.map((v) => v - floor); // positivo: más fuerte = más intenso
    } catch (err) {
      return res.status(500).json({ error: `No se pudo analizar el audio: ${err.message}` });
    }
    source = "Intensidad del audio";
  }
  const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
  const clips = pickPeaks(scores, 1, length, count, duration).map(([s, e, sc], n) => ({
    start: round(s), end: round(e), score: round(sc, 3), name: `highlight_${n + 1}`,
  }));
  res.json({ source, clips });
});

// ---------------------------------------------------------------- exportar

// Mejora de calidad con ffmpeg: reduce ruido, aumenta nitidez y color, y opcionalmente escala con
// lanczos. No inventa detalle como un escalador con IA, pero se ve más nítido en pantallas grandes.
const ENHANCE_LEVELS = new Set(["original", "enhance", "1080", "2160"]);
const ENHANCE_FILTER = "hqdn3d=1.5:1.5:6:6,unsharp=5:5:0.8:5:5:0,eq=contrast=1.03:saturation=1.08";

function videoFilters(vertical, enhance) {
  const filters = [];
  if (vertical) {
    const [w, h] = enhance === "2160" ? [2160, 3840] : [1080, 1920];
    filters.push("crop='min(iw,ih*9/16)':ih", `scale=${w}:${h}:flags=lanczos`, "setsar=1");
  } else if (enhance === "1080" || enhance === "2160") {
    // Solo sube la resolución: si el video ya es más grande, se queda igual.
    filters.push(`scale=-2:'max(${enhance},ih)':flags=lanczos`, "setsar=1");
  }
  if (enhance !== "original") filters.push(ENHANCE_FILTER);
  return filters.join(",");
}

async function runExport(exportId, job, clips, vertical, precise, enhance = "original") {
  const exp = exports_.get(exportId);
  const src = path.join(jobDir(job.id), job.file);
  const outDir = path.dirname(exportFile(exportId));
  const save = () => writeJson(exportFile(exportId), exp);
  fs.mkdirSync(outDir, { recursive: true });
  save();
  const crf = enhance === "original" ? "20" : "18"; // más calidad de imagen al mejorar
  const encode = ["-c:v", "libx264", "-preset", "veryfast", "-crf", crf, "-c:a", "aac", "-b:a", "160k"];
  const vf = videoFilters(vertical, enhance);
  try {
    for (const [n, c] of clips.entries()) {
      exp.message = `Cortando ${n + 1} de ${clips.length}: ${c.name}`;
      save();
      const outName = `${String(n + 1).padStart(2, "0")}_${c.name}.mp4`;
      const args = ["-y", "-v", "error", "-ss", c.start.toFixed(3), "-i", src, "-t", (c.end - c.start).toFixed(3)];
      if (vf) args.push("-vf", vf, ...encode);
      else if (precise) args.push(...encode);
      else args.push("-c", "copy", "-avoid_negative_ts", "make_zero");
      args.push("-movflags", "+faststart", path.join(outDir, outName));
      await ffmpeg(args);
      exp.files.push({ name: outName, url: `/media/${job.id}/clips/${exportId.slice(32)}/${encodeURIComponent(outName)}` });
      exp.progress = Math.round(((n + 1) * 100) / clips.length);
    }
    Object.assign(exp, { status: "done", message: "¡Clips listos!" });
  } catch (err) {
    Object.assign(exp, { status: "error", message: err.message.slice(-500) || "Error de ffmpeg" });
  }
  save();
  exports_.delete(exportId); // a partir de aquí se lee de disco, igual que en las demás instancias
}

app.post("/api/jobs/:id/export", (req, res) => {
  const job = getJob(req, res);
  if (!job) return;
  if (job.status !== "ready") return res.status(400).json({ error: "El video aún no está listo" });
  const duration = Number(job.duration);
  const clips = [];
  for (const [n, c] of (req.body.clips || []).entries()) {
    const start = Math.max(0, Number(c.start));
    const end = Math.min(duration, Number(c.end));
    if (!(end - start >= 0.5)) return res.status(400).json({ error: `El clip ${n + 1} es demasiado corto` });
    if (end - start > MAX_CLIP_SECONDS + 0.01) return res.status(400).json({ error: `El clip ${n + 1} supera los 10 minutos` });
    clips.push({ start, end, name: safeName(c.name, `clip_${n + 1}`) });
  }
  if (!clips.length) return res.status(400).json({ error: "No hay clips para exportar" });
  const exportId = job.id + newId();
  exports_.set(exportId, { id: exportId, job: job.id, status: "working", progress: 0, message: "Preparando…", files: [] });
  const enhance = ENHANCE_LEVELS.has(req.body.enhance) ? req.body.enhance : "original";
  runExport(exportId, job, clips, Boolean(req.body.vertical), req.body.precise !== false, enhance);
  res.json({ id: exportId });
});

app.get("/api/exports/:id", (req, res) => {
  const exp = loadExport(req.params.id);
  if (!exp) return res.status(404).json({ error: "No se encontró la exportación. Vuelve a exportar los clips." });
  res.json(exp);
});

app.get("/api/exports/:id/zip", (req, res) => {
  const exp = loadExport(req.params.id);
  if (!exp) return res.sendStatus(404);
  const folder = path.dirname(exportFile(exp.id));
  const title = safeName(loadJob(exp.job)?.title, "clips");
  res.attachment(`${title}_clips.zip`);
  const zip = archiver("zip", { store: true });
  zip.on("error", () => res.destroy());
  zip.pipe(res);
  for (const f of exp.files) zip.file(path.join(folder, f.name), { name: f.name });
  zip.finalize();
});

// ---------------------------------------------------------------- páginas y SEO

const siteUrl = (req) => SITE_URL || `${req.protocol}://${req.get("host")}`;
const pageUrl = (req, slug) => `${siteUrl(req)}/${slug}`;

function structuredData(req, page, canonical, faq) {
  const base = siteUrl(req);
  const image = `${base}/static/icons/og-image.png`;
  const breadcrumbs = [{ "@type": "ListItem", position: 1, name: SITE_NAME, item: pageUrl(req, "") }];
  if (page.slug) breadcrumbs.push({ "@type": "ListItem", position: 2, name: page.h1, item: canonical });
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${base}/#website`, url: `${base}/`, name: SITE_NAME, inLanguage: "es",
        publisher: { "@id": `${base}/#org` } },
      { "@type": "Organization", "@id": `${base}/#org`, name: SITE_NAME, url: `${base}/`,
        logo: `${base}/static/icons/icon-512.png` },
      { "@type": "WebApplication", "@id": `${base}/#app`, name: SITE_NAME, url: `${base}/`,
        description: PAGES_BY_SLUG[""].about, applicationCategory: "MultimediaApplication",
        applicationSubCategory: "Descargador y editor de video",
        operatingSystem: "Web, Windows, macOS, Linux, Android, iOS",
        browserRequirements: "Requiere JavaScript y un navegador moderno", inLanguage: "es",
        isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: FEATURES.map(([name]) => name), image },
      { "@type": "WebPage", "@id": `${canonical}#webpage`, url: canonical, name: page.title,
        description: page.description, inLanguage: "es", isPartOf: { "@id": `${base}/#website` },
        about: { "@id": `${base}/#app` }, dateModified: LAST_UPDATE, primaryImageOfPage: image },
      { "@type": "HowTo", name: page.h1, description: page.description, totalTime: "PT2M",
        tool: { "@type": "HowToTool", name: SITE_NAME },
        step: page.steps.map(([name, text], i) => ({ "@type": "HowToStep", position: i + 1, name, text })) },
      { "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({
        "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
      { "@type": "BreadcrumbList", itemListElement: breadcrumbs },
    ],
  };
  return JSON.stringify(ld).replace(/</g, "\\u003c");
}

// ---------------------------------------------------------------- administración (cookies de YouTube)
// Solo existe si se define ADMIN_TOKEN. Permite subir cookies.txt y probar un enlace de YouTube.

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
// Fuera de la carpeta de la app, para que no se borre al volver a desplegar.
const ADMIN_COOKIES_PATH = path.join(os.homedir(), "yt-clipper", "cookies.txt");
const sha = (v) => crypto.createHash("sha256").update(String(v)).digest();

function requireAdmin(req, res, next) {
  if (!ADMIN_TOKEN) return res.status(404).type("text/plain").send("Página no encontrada");
  res.set("X-Robots-Tag", "noindex, nofollow");
  res.set("Cache-Control", "no-store");
  if (req.method === "GET" && req.path === "/admin") return next();
  if (crypto.timingSafeEqual(sha(req.get("x-admin-token") || ""), sha(ADMIN_TOKEN))) return next();
  setTimeout(() => res.status(401).json({ error: "Contraseña incorrecta" }), 1000); // frena los intentos
}

function cookiesStatus() {
  const src = COOKIE_CANDIDATES.find((f) => fs.existsSync(f));
  if (!src && !process.env.YTDLP_COOKIES) return { configured: false };
  const text = src ? fs.readFileSync(src, "utf8") : process.env.YTDLP_COOKIES;
  const youtube = text.split(/\r?\n/).filter((l) => /(^|\t)\.?(youtube|google)\.com\t/.test(l)).length;
  return {
    configured: true,
    source: src ? (src === ADMIN_COOKIES_PATH ? "subidas desde esta página" : "archivo en el servidor") : "variable YTDLP_COOKIES",
    updated: src ? fs.statSync(src).mtime.toISOString() : null,
    youtubeCookies: youtube,
  };
}

app.get("/admin", requireAdmin, (req, res) => res.sendFile(path.join(__dirname, "views", "admin.html")));

app.get("/admin/status", requireAdmin, async (req, res) => {
  let ytdlp = null;
  try {
    const yt = await (await binaries(DATA_DIR)).ytdlp();
    ytdlp = (await run(yt.cmd, [...yt.pre, "--version"], { env: yt.env })).stdout.trim();
  } catch (err) {
    ytdlp = `error: ${err.message}`;
  }
  res.json({ cookies: cookiesStatus(), proxy: Boolean(process.env.YTDLP_PROXY), ytdlp });
});

const cookieUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024 } });
app.post("/admin/cookies", requireAdmin, cookieUpload.single("file"), (req, res) => {
  const text = req.file ? req.file.buffer.toString("utf8") : "";
  const lines = text.split(/\r?\n/).filter((l) => l.split("\t").length >= 7);
  if (!lines.length) {
    return res.status(400).json({ error: "El archivo no parece un cookies.txt en formato Netscape (líneas separadas por tabulaciones)." });
  }
  if (!lines.some((l) => /youtube\.com\t/.test(l))) {
    return res.status(400).json({ error: "El archivo no tiene cookies de youtube.com. Expórtalas estando en youtube.com." });
  }
  fs.mkdirSync(path.dirname(ADMIN_COOKIES_PATH), { recursive: true, mode: 0o700 });
  fs.writeFileSync(ADMIN_COOKIES_PATH, text, { mode: 0o600 });
  fs.rmSync(path.join(DATA_DIR, ".cookies.txt"), { force: true }); // la próxima descarga usa las nuevas
  res.json({ ok: true, cookies: cookiesStatus() });
});

app.delete("/admin/cookies", requireAdmin, (req, res) => {
  fs.rmSync(ADMIN_COOKIES_PATH, { force: true });
  fs.rmSync(path.join(DATA_DIR, ".cookies.txt"), { force: true });
  res.json({ ok: true, cookies: cookiesStatus() });
});

app.post("/admin/test", requireAdmin, async (req, res) => {
  const url = String(req.body.url || "").trim();
  if (!/^https?:\/\//i.test(url)) return res.status(400).json({ error: "Pega un enlace válido (https://…)" });
  try {
    const yt = await (await binaries(DATA_DIR)).ytdlp();
    const { stdout } = await run(yt.cmd, [...yt.pre, ...ytdlpAccessArgs(), "--simulate", "--no-playlist",
      "--no-warnings", "--print", "%(title)s · %(duration_string)s", url], { env: yt.env });
    res.json({ ok: true, result: stdout.trim() });
  } catch (err) {
    res.json({ ok: false, error: friendlyDownloadError(err.message), detail: err.message.slice(-400) });
  }
});

app.get("/robots.txt", (req, res) => {
  const rules = "Allow: /\nDisallow: /api/\nDisallow: /media/\nDisallow: /admin\n\n";
  // Permitir explícitamente los rastreadores de buscadores con IA (GEO).
  const bots = ["Googlebot", "Bingbot", "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot",
    "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot", "Applebot-Extended",
    "DuckDuckBot", "YandexBot"];
  res.type("text/plain").send(
    `User-agent: *\n${rules}` + bots.map((b) => `User-agent: ${b}\n${rules}`).join("") +
      `Sitemap: ${siteUrl(req)}/sitemap.xml\n`);
});

app.get("/sitemap.xml", (req, res) => {
  const urls = PAGES.map((p) =>
    `<url><loc>${pageUrl(req, p.slug)}</loc><lastmod>${LAST_UPDATE}</lastmod>` +
    `<changefreq>weekly</changefreq><priority>${p.slug ? "0.8" : "1.0"}</priority></url>`).join("");
  res.type("application/xml").send(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
});

// Resumen para modelos de lenguaje (ChatGPT, Claude, Perplexity, Gemini). Ver https://llmstxt.org
app.get("/llms.txt", (req, res) => {
  const lines = [`# ${SITE_NAME}`, "", `> ${PAGES_BY_SLUG[""].about}`, "", "## Funciones", "",
    ...FEATURES.map(([t, d]) => `- ${t}: ${d}`),
    "", "## Sitios compatibles", "", `${PLATFORMS.join(", ")}.`, "", "## Guías", "",
    ...PAGES.map((p) => `- [${p.h1}](${pageUrl(req, p.slug)}): ${p.description}`),
    "", "## Preguntas frecuentes", "",
    ...GENERAL_FAQ.map(([q, a]) => `### ${q}\n${a}\n`)];
  res.type("text/plain").send(lines.join("\n"));
});

app.get("/manifest.webmanifest", (req, res) => {
  res.type("application/manifest+json").json({
    name: `${SITE_NAME}: descargar y cortar videos`, short_name: SITE_NAME, lang: "es",
    description: PAGES_BY_SLUG[""].description, start_url: "/", display: "standalone",
    background_color: "#000180", theme_color: "#000180",
    icons: [192, 512].map((n) => ({ src: `/static/icons/icon-${n}.png`, sizes: `${n}x${n}`, type: "image/png" })),
  });
});

app.get("/favicon.ico", (req, res) => res.sendFile(path.join(__dirname, "static", "icons", "favicon.ico")));

app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});
// Los archivos se sirven bajo /static/v-<huella>/…: cada versión nueva tiene otra dirección, así ni el
// navegador ni el CDN de Hostinger mezclan HTML nuevo con CSS o JS viejos.
app.use((req, res, next) => {
  const m = req.url.match(/^\/static\/v-[0-9a-f]+\/(.*)$/);
  if (m) {
    req.url = `/static/${m[1]}`;
    res.locals.immutable = true;
  }
  next();
});
app.use("/static", express.static(path.join(__dirname, "static"), {
  maxAge: "1h",
  setHeaders: (res) => {
    if (res.locals.immutable) res.set("Cache-Control", "public, max-age=31536000, immutable");
  },
}));

app.get(["/", "/:slug"], (req, res, next) => {
  const slug = req.params.slug || "";
  const page = PAGES_BY_SLUG[slug];
  if (!page) return next();
  const canonical = pageUrl(req, slug);
  const faq = [...page.faq, ...GENERAL_FAQ];
  res.render("index", {
    page, faq, canonical, site_url: siteUrl(req), site_name: SITE_NAME, features: FEATURES, platforms: PLATFORMS,
    nav: NAV.map(([s, label]) => [s, label, pageUrl(req, s)]), last_update: LAST_UPDATE,
    max_clip: MAX_CLIP_SECONDS, asset, ld: structuredData(req, page, canonical, faq),
  });
});

app.use((req, res) => res.status(404).type("text/plain").send("Página no encontrada"));

// Borra videos y clips viejos para no llenar el disco del hosting.
const KEEP_HOURS = Number(process.env.KEEP_HOURS) || 6;
setInterval(() => {
  const limit = Date.now() - KEEP_HOURS * 3600 * 1000;
  for (const id of fs.readdirSync(DATA_DIR)) {
    const dir = jobDir(id);
    if (!dir || fs.statSync(dir).mtimeMs > limit) continue;
    fs.rmSync(dir, { recursive: true, force: true });
    jobs.delete(id);
    for (const [eid, exp] of exports_) if (exp.job === id) exports_.delete(eid);
  }
}, 30 * 60 * 1000).unref();

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, process.env.HOST, () => {
  console.log(`YT Clipper listo en http://localhost:${PORT}`);
  // Prepara ffmpeg y yt-dlp al arrancar para que la primera descarga no espere (y avisar si fallan).
  binaries(DATA_DIR)
    .then((b) => b.ytdlp().then((yt) => console.log(`ffmpeg: ${b.ffmpeg}\nyt-dlp: ${[yt.cmd, ...yt.pre].join(" ")}`)))
    .catch((err) => console.error(`Aviso: ${err.message}`));
});
