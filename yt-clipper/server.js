// YT Clipper: descarga videos de YouTube y córtalos en highlights o en partes de máx. 10 minutos.
// Servidor Express (compatible con el hosting Node.js de Hostinger, Render, Railway, etc.).

const crypto = require("crypto");
const fs = require("fs");
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
    const bins = await binaries(DATA_DIR);
    const yt = await bins.ytdlp();
    job.message = "Descargando…";
    await run(yt.cmd, [
      ...yt.pre,
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
    Object.assign(job, { status: "error", message: err.message });
  }
}

app.post("/api/download", (req, res) => {
  const url = String(req.body.url || "").trim();
  if (!/^https?:\/\//i.test(url)) return res.status(400).json({ error: "Pega un enlace válido (https://…)" });
  const id = newId();
  fs.mkdirSync(jobDir(id));
  jobs.set(id, { id, status: "downloading", progress: 0, message: "Iniciando…" });
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
    jobs.set(id, {
      id, status: "ready", progress: 100, message: "Listo", title,
      duration: await probeDuration(out), heatmap: [], chapters: [], file: "video.mp4",
    });
    res.json({ id });
  } catch (err) {
    res.status(400).json({ error: `No se pudo leer el video: ${err.message}` });
  }
});

function getJob(req, res) {
  const job = jobs.get(req.params.id);
  if (!job) res.status(404).json({ error: "No encontrado" });
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

async function runExport(exportId, job, clips, vertical, precise) {
  const exp = exports_.get(exportId);
  const src = path.join(jobDir(job.id), job.file);
  const outDir = path.join(jobDir(job.id), "clips", exportId);
  fs.mkdirSync(outDir, { recursive: true });
  const encode = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", "-b:a", "160k"];
  try {
    for (const [n, c] of clips.entries()) {
      exp.message = `Cortando ${n + 1} de ${clips.length}: ${c.name}`;
      const outName = `${String(n + 1).padStart(2, "0")}_${c.name}.mp4`;
      const args = ["-y", "-v", "error", "-ss", c.start.toFixed(3), "-i", src, "-t", (c.end - c.start).toFixed(3)];
      if (vertical) args.push("-vf", "crop='min(iw,ih*9/16)':ih,scale=1080:1920,setsar=1", ...encode);
      else if (precise) args.push(...encode);
      else args.push("-c", "copy", "-avoid_negative_ts", "make_zero");
      args.push("-movflags", "+faststart", path.join(outDir, outName));
      await ffmpeg(args);
      exp.files.push({ name: outName, url: `/media/${job.id}/clips/${exportId}/${encodeURIComponent(outName)}` });
      exp.progress = Math.round(((n + 1) * 100) / clips.length);
    }
    Object.assign(exp, { status: "done", message: "¡Clips listos!" });
  } catch (err) {
    Object.assign(exp, { status: "error", message: err.message.slice(-500) || "Error de ffmpeg" });
  }
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
  const exportId = newId();
  exports_.set(exportId, { id: exportId, job: job.id, status: "working", progress: 0, message: "Preparando…", files: [] });
  runExport(exportId, job, clips, Boolean(req.body.vertical), req.body.precise !== false);
  res.json({ id: exportId });
});

app.get("/api/exports/:id", (req, res) => {
  const exp = exports_.get(req.params.id);
  if (!exp) return res.status(404).json({ error: "No encontrado" });
  res.json(exp);
});

app.get("/api/exports/:id/zip", (req, res) => {
  const exp = exports_.get(req.params.id);
  if (!exp) return res.sendStatus(404);
  const folder = path.join(jobDir(exp.job), "clips", exp.id);
  const title = safeName(jobs.get(exp.job)?.title, "clips");
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

app.get("/robots.txt", (req, res) => {
  const rules = "Allow: /\nDisallow: /api/\nDisallow: /media/\n\n";
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
app.use("/static", express.static(path.join(__dirname, "static"), { maxAge: "7d" }));

app.get(["/", "/:slug"], (req, res, next) => {
  const slug = req.params.slug || "";
  const page = PAGES_BY_SLUG[slug];
  if (!page) return next();
  const canonical = pageUrl(req, slug);
  const faq = [...page.faq, ...GENERAL_FAQ];
  res.render("index", {
    page, faq, canonical, site_url: siteUrl(req), site_name: SITE_NAME, features: FEATURES, platforms: PLATFORMS,
    nav: NAV.map(([s, label]) => [s, label, pageUrl(req, s)]), last_update: LAST_UPDATE,
    max_clip: MAX_CLIP_SECONDS, ld: structuredData(req, page, canonical, faq),
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
