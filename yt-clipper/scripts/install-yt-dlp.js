// Descarga el ejecutable de yt-dlp (no necesita Python) en ./bin.
// Se ejecuta en `npm install` (postinstall) y también al vuelo si falta al descargar un video.
const fs = require("fs");
const path = require("path");

const BIN_DIR = path.join(__dirname, "..", "bin");
const ASSETS = { linux: "yt-dlp_linux", darwin: "yt-dlp_macos", win32: "yt-dlp.exe" };
const BIN_PATH = path.join(BIN_DIR, process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");
const RELEASE_URL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download";

async function download(url, dest) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`No se pudo descargar ${path.basename(url)} (${res.status})`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.tmp`;
  fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  fs.chmodSync(tmp, 0o755);
  fs.renameSync(tmp, dest);
  return dest;
}

async function installYtDlp({ force = false } = {}) {
  if (!force && fs.existsSync(BIN_PATH)) return BIN_PATH;
  let asset = ASSETS[process.platform];
  if (!asset) throw new Error(`Plataforma no soportada: ${process.platform}`);
  if (process.platform === "linux" && process.arch === "arm64") asset = "yt-dlp_linux_aarch64";
  return download(`${RELEASE_URL}/${asset}`, BIN_PATH);
}

/** Versión de yt-dlp que se ejecuta con Python (para servidores donde el binario no puede ejecutarse). */
const installYtDlpZipapp = (dest) => download(`${RELEASE_URL}/yt-dlp`, dest);

module.exports = { installYtDlp, installYtDlpZipapp, BIN_PATH };

if (require.main === module) {
  installYtDlp({ force: process.argv.includes("--force") })
    .then((p) => console.log(`yt-dlp listo en ${p}`))
    // No rompe `npm install`: el servidor lo vuelve a intentar al primer uso.
    .catch((e) => console.warn(`Aviso: ${e.message}. Se intentará de nuevo al iniciar una descarga.`));
}
