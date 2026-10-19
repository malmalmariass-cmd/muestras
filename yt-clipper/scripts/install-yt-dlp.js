// Descarga el ejecutable de yt-dlp (no necesita Python) en ./bin.
// Se ejecuta en `npm install` (postinstall) y también al vuelo si falta al descargar un video.
const fs = require("fs");
const path = require("path");

const BIN_DIR = path.join(__dirname, "..", "bin");
const ASSETS = { linux: "yt-dlp_linux", darwin: "yt-dlp_macos", win32: "yt-dlp.exe" };
const BIN_PATH = path.join(BIN_DIR, process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");

async function installYtDlp({ force = false } = {}) {
  if (!force && fs.existsSync(BIN_PATH)) return BIN_PATH;
  let asset = ASSETS[process.platform];
  if (!asset) throw new Error(`Plataforma no soportada: ${process.platform}`);
  if (process.platform === "linux" && process.arch === "arm64") asset = "yt-dlp_linux_aarch64";
  const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${asset}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`No se pudo descargar yt-dlp (${res.status})`);
  fs.mkdirSync(BIN_DIR, { recursive: true });
  const tmp = `${BIN_PATH}.tmp`;
  fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  fs.chmodSync(tmp, 0o755);
  fs.renameSync(tmp, BIN_PATH);
  return BIN_PATH;
}

module.exports = { installYtDlp, BIN_PATH };

if (require.main === module) {
  installYtDlp({ force: process.argv.includes("--force") })
    .then((p) => console.log(`yt-dlp listo en ${p}`))
    // No rompe `npm install`: el servidor lo vuelve a intentar al primer uso.
    .catch((e) => console.warn(`Aviso: ${e.message}. Se intentará de nuevo al iniciar una descarga.`));
}
