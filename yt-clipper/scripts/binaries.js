// Encuentra una forma de ejecutar ffmpeg, ffprobe y yt-dlp en el servidor.
//
// Algunos hostings (p. ej. Hostinger) copian la app a otra carpeta después de `npm install` y
// pierden el permiso de ejecución, o montan la carpeta de la app sin permiso para ejecutar
// programas (error EACCES). Por eso, para cada programa se prueba en orden:
//   1. el archivo original, devolviéndole el permiso de ejecución (chmod 755);
//   2. una copia en una carpeta con permisos de escritura (datos de la app, ~/.cache, /tmp);
//   3. solo para yt-dlp: el programa del sistema o la versión de Python (si hay python3).
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const ffmpegStatic = require("ffmpeg-static");
const ffprobeStatic = require("ffprobe-static").path;
const { installYtDlp, installYtDlpZipapp, BIN_PATH } = require("./install-yt-dlp");

/** Ejecuta `cmd args` y dice si terminó bien (sin lanzar errores). */
function works(cmd, args, env) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(cmd, args, { stdio: "ignore", env });
    } catch {
      return resolve(false);
    }
    const timer = setTimeout(() => child.kill("SIGKILL"), 120000);
    child.on("error", () => { clearTimeout(timer); resolve(false); });
    child.on("close", (code) => { clearTimeout(timer); resolve(code === 0); });
  });
}

function copyDirs(dataDir) {
  return [path.join(dataDir, ".bin"), path.join(os.homedir(), ".cache", "yt-clipper"), path.join(os.tmpdir(), "yt-clipper")];
}

/** Devuelve una ruta ejecutable para `src`, o null si no se pudo en ninguna carpeta. */
async function makeRunnable(src, testArgs, { dataDir, env }) {
  if (!src || !fs.existsSync(src)) return null;
  try { fs.chmodSync(src, 0o755); } catch { /* puede no ser nuestro: se prueba igual */ }
  if (await works(src, testArgs, env)) return src;
  for (const dir of copyDirs(dataDir)) {
    const dest = path.join(dir, path.basename(src));
    try {
      fs.mkdirSync(dir, { recursive: true });
      if (!fs.existsSync(dest) || fs.statSync(dest).size !== fs.statSync(src).size) fs.copyFileSync(src, dest);
      fs.chmodSync(dest, 0o755);
    } catch {
      continue;
    }
    if (await works(dest, testArgs, env)) return dest;
  }
  return null;
}

async function findPython(env) {
  const check = ["-c", "import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)"];
  for (const py of ["python3", "python3.12", "python3.11", "python3.10", "python3.9", "python"]) {
    if (await works(py, check, env)) return py;
  }
  return null;
}

async function resolveYtDlp({ dataDir, env, ffmpegDir }) {
  const ytEnv = { ...env, PATH: `${ffmpegDir}${path.delimiter}${env.PATH || ""}` };
  if (process.env.YTDLP_PATH) {
    const p = await makeRunnable(process.env.YTDLP_PATH, ["--version"], { dataDir, env: ytEnv });
    if (p) return { cmd: p, pre: [], env: ytEnv };
  }
  try { await installYtDlp(); } catch { /* sin red al instalar: se prueban las alternativas */ }
  const bin = await makeRunnable(BIN_PATH, ["--version"], { dataDir, env: ytEnv });
  if (bin) return { cmd: bin, pre: [], env: ytEnv };
  if (await works("yt-dlp", ["--version"], ytEnv)) return { cmd: "yt-dlp", pre: [], env: ytEnv };

  const py = await findPython(ytEnv);
  if (py) {
    const zipapp = path.join(dataDir, ".bin", "yt-dlp.pyz");
    if (!fs.existsSync(zipapp)) await installYtDlpZipapp(zipapp);
    if (await works(py, [zipapp, "--version"], ytEnv)) return { cmd: py, pre: [zipapp], env: ytEnv };
  }
  throw new Error("Este servidor no permite ejecutar yt-dlp (permiso denegado) y no tiene Python 3.9+. " +
    "Prueba en un VPS o define YTDLP_PATH con un yt-dlp instalado en el servidor.");
}

let cached = null;

/**
 * Resuelve (una sola vez) cómo ejecutar cada programa.
 * Devuelve { ffmpeg, ffprobe, ytdlp: () => Promise<{ cmd, pre, env }> }.
 */
function binaries(dataDir) {
  if (cached) return cached;
  const tmp = path.join(dataDir, "tmp");
  fs.mkdirSync(tmp, { recursive: true });
  // yt-dlp_linux se descomprime en TMPDIR al arrancar; en una carpeta propia evita /tmp sin permisos.
  const env = { ...process.env, TMPDIR: tmp };
  cached = (async () => {
    const ffmpeg = await makeRunnable(ffmpegStatic, ["-version"], { dataDir, env });
    const ffprobe = await makeRunnable(ffprobeStatic, ["-version"], { dataDir, env });
    if (!ffmpeg || !ffprobe) {
      throw new Error("Este servidor no permite ejecutar ffmpeg (permiso denegado). Revisa los permisos o usa un VPS.");
    }
    let yt = null;
    const ytdlp = () => {
      yt = yt || resolveYtDlp({ dataDir, env, ffmpegDir: path.dirname(ffmpeg) });
      return yt.catch((err) => { yt = null; throw err; }); // se reintenta en la próxima descarga
    };
    return { ffmpeg, ffprobe, ytdlp };
  })();
  cached.catch(() => { cached = null; });
  return cached;
}

module.exports = { binaries };
