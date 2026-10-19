"""YT Clipper: descarga videos de YouTube y córtalos en highlights o en partes de máx. 10 minutos."""

import io
import json
import math
import os
import re
import subprocess
import threading
import uuid
import zipfile

from flask import Flask, abort, jsonify, render_template, request, send_file, send_from_directory

import yt_dlp

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.environ.get("YTCLIPPER_DATA", os.path.join(BASE_DIR, "data"))
MAX_CLIP_SECONDS = 600  # 10 minutos
QUALITY_FORMATS = {
    "720": "bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720][ext=mp4]/bv*[height<=720]+ba/b[height<=720]",
    "1080": "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080][ext=mp4]/bv*[height<=1080]+ba/b[height<=1080]",
    "best": "bv*+ba/b",
}
ALLOWED_UPLOAD_EXT = {".mp4", ".mov", ".mkv", ".webm", ".m4v"}

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 4 * 1024 * 1024 * 1024  # 4 GB

os.makedirs(DATA_DIR, exist_ok=True)
jobs = {}
exports = {}
ID_RE = re.compile(r"^[0-9a-f]{32}$")


def new_id():
    return uuid.uuid4().hex


def job_dir(job_id):
    if not ID_RE.match(job_id):
        abort(404)
    return os.path.join(DATA_DIR, job_id)


def get_job(job_id):
    job = jobs.get(job_id)
    if not job:
        abort(404)
    return job


def safe_name(name, fallback):
    name = re.sub(r"[^\w\-. ]+", "", name or "", flags=re.UNICODE).strip().replace(" ", "_")
    return name[:80] or fallback


def probe_duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", path],
        capture_output=True, text=True, check=True,
    )
    return float(json.loads(out.stdout)["format"]["duration"])


# ---------------------------------------------------------------- descarga

def run_download(job_id, url, quality):
    job = jobs[job_id]
    out_dir = job_dir(job_id)

    def hook(d):
        if d["status"] == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            if total:
                job["progress"] = round(d.get("downloaded_bytes", 0) * 100 / total, 1)
            job["message"] = f"Descargando… {d.get('_speed_str', '').strip()}"
        elif d["status"] == "finished":
            job["message"] = "Uniendo audio y video…"

    opts = {
        "format": QUALITY_FORMATS.get(quality, QUALITY_FORMATS["1080"]),
        "merge_output_format": "mp4",
        "outtmpl": os.path.join(out_dir, "video.%(ext)s"),
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "progress_hooks": [hook],
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True)
        path = next(
            os.path.join(out_dir, f) for f in os.listdir(out_dir) if f.startswith("video.")
        )
        if not path.endswith(".mp4"):
            fixed = os.path.join(out_dir, "video.mp4")
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", path, "-c", "copy", fixed], check=True)
            os.remove(path)
            path = fixed
        job.update(
            status="ready",
            progress=100,
            message="Listo",
            title=info.get("title") or "video",
            duration=info.get("duration") or probe_duration(path),
            heatmap=info.get("heatmap") or [],
            chapters=info.get("chapters") or [],
            file=os.path.basename(path),
        )
    except Exception as exc:  # noqa: BLE001 - se muestra al usuario
        job.update(status="error", message=str(exc))


@app.post("/api/download")
def api_download():
    body = request.get_json(force=True)
    url = (body.get("url") or "").strip()
    if not re.match(r"^https?://", url):
        return jsonify(error="Pega un enlace válido (https://…)"), 400
    job_id = new_id()
    os.makedirs(job_dir(job_id))
    jobs[job_id] = {"id": job_id, "status": "downloading", "progress": 0, "message": "Iniciando…"}
    threading.Thread(target=run_download, args=(job_id, url, body.get("quality", "1080")), daemon=True).start()
    return jsonify(id=job_id)


@app.post("/api/upload")
def api_upload():
    f = request.files.get("file")
    ext = os.path.splitext(f.filename or "")[1].lower() if f else ""
    if not f or ext not in ALLOWED_UPLOAD_EXT:
        return jsonify(error="Sube un archivo de video (mp4, mov, mkv, webm)"), 400
    job_id = new_id()
    out_dir = job_dir(job_id)
    os.makedirs(out_dir)
    raw = os.path.join(out_dir, "upload" + ext)
    f.save(raw)
    path = os.path.join(out_dir, "video.mp4")
    if ext == ".mp4":
        os.rename(raw, path)
    else:
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", raw, "-c:v", "libx264", "-preset", "veryfast",
                        "-c:a", "aac", "-movflags", "+faststart", path], check=True)
        os.remove(raw)
    jobs[job_id] = {
        "id": job_id, "status": "ready", "progress": 100, "message": "Listo",
        "title": os.path.splitext(f.filename)[0], "duration": probe_duration(path),
        "heatmap": [], "chapters": [], "file": "video.mp4",
    }
    return jsonify(id=job_id)


@app.get("/api/jobs/<job_id>")
def api_job(job_id):
    return jsonify(get_job(job_id))


@app.get("/media/<job_id>/<path:filename>")
def media(job_id, filename):
    return send_from_directory(job_dir(job_id), filename, conditional=True)


# ---------------------------------------------------------------- highlights

def audio_energy(path):
    """Volumen RMS (dB) por segundo usando ffmpeg astats."""
    cmd = [
        "ffmpeg", "-v", "error", "-i", path, "-vn", "-af",
        "aresample=8000,asetnsamples=8000,astats=metadata=1:reset=1,"
        "ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-",
        "-f", "null", "-",
    ]
    out = subprocess.run(cmd, capture_output=True, text=True).stdout
    values = []
    for m in re.finditer(r"RMS_level=(-?[\d.]+|-inf)", out):
        v = m.group(1)
        values.append(-90.0 if v == "-inf" else max(float(v), -90.0))
    return values


def pick_peaks(scores, step, length, count, duration):
    """Elige `count` ventanas de `length` s con mayor puntuación sin solaparse."""
    win = max(1, int(round(length / step)))
    if len(scores) < win:
        return [(0.0, min(length, duration), 1.0)]
    sums = [sum(scores[:win])]
    for i in range(1, len(scores) - win + 1):
        sums.append(sums[-1] - scores[i - 1] + scores[i + win - 1])
    order = sorted(range(len(sums)), key=lambda i: sums[i], reverse=True)
    chosen = []
    for i in order:
        if all(abs(i - j) >= win for j in chosen):
            chosen.append(i)
        if len(chosen) == count:
            break
    best = sums[order[0]] or 1
    result = []
    for i in sorted(chosen):
        start = i * step
        result.append((start, min(start + length, duration), sums[i] / best))
    return result


@app.post("/api/jobs/<job_id>/highlights")
def api_highlights(job_id):
    job = get_job(job_id)
    if job["status"] != "ready":
        return jsonify(error="El video aún no está listo"), 400
    body = request.get_json(force=True)
    count = max(1, min(int(body.get("count", 5)), 30))
    duration = float(job["duration"])
    length = max(5.0, min(float(body.get("length", 30)), MAX_CLIP_SECONDS, duration))

    heatmap = job.get("heatmap") or []
    if heatmap and body.get("source", "auto") != "audio":
        # "Lo más visto" de YouTube: muestras de ~1 % del video; se re-muestrea a 1 s.
        scores = [0.0] * int(math.ceil(duration))
        for h in heatmap:
            for s in range(int(h["start_time"]), min(int(math.ceil(h["end_time"])), len(scores))):
                scores[s] = h["value"]
        source = "Lo más visto de YouTube"
    else:
        rms = audio_energy(os.path.join(job_dir(job_id), job["file"]))
        floor = min(rms) if rms else -90
        scores = [v - floor for v in rms]  # positivo: más fuerte = más intenso
        source = "Intensidad del audio"

    clips = [
        {"start": round(s, 2), "end": round(e, 2), "score": round(sc, 3), "name": f"highlight_{n + 1}"}
        for n, (s, e, sc) in enumerate(pick_peaks(scores, 1.0, length, count, duration))
    ]
    return jsonify(source=source, clips=clips)


# ---------------------------------------------------------------- exportar

def run_export(export_id, job_id, clips, vertical, precise):
    exp = exports[export_id]
    src = os.path.join(job_dir(job_id), jobs[job_id]["file"])
    out_dir = os.path.join(job_dir(job_id), "clips", export_id)
    os.makedirs(out_dir, exist_ok=True)
    try:
        for n, c in enumerate(clips):
            exp["message"] = f"Cortando {n + 1} de {len(clips)}: {c['name']}"
            out_name = f"{n + 1:02d}_{c['name']}.mp4"
            out = os.path.join(out_dir, out_name)
            dur = c["end"] - c["start"]
            cmd = ["ffmpeg", "-y", "-v", "error", "-ss", f"{c['start']:.3f}", "-i", src, "-t", f"{dur:.3f}"]
            if vertical:
                cmd += ["-vf", "crop='min(iw,ih*9/16)':ih,scale=1080:1920,setsar=1",
                        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", "-b:a", "160k"]
            elif precise:
                cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", "-b:a", "160k"]
            else:
                cmd += ["-c", "copy", "-avoid_negative_ts", "make_zero"]
            cmd += ["-movflags", "+faststart", out]
            subprocess.run(cmd, check=True, capture_output=True)
            exp["files"].append({"name": out_name, "url": f"/media/{job_id}/clips/{export_id}/{out_name}"})
            exp["progress"] = round((n + 1) * 100 / len(clips))
        exp.update(status="done", message="¡Clips listos!")
    except subprocess.CalledProcessError as exc:
        exp.update(status="error", message=exc.stderr.decode(errors="ignore")[-500:] or "Error de ffmpeg")


@app.post("/api/jobs/<job_id>/export")
def api_export(job_id):
    job = get_job(job_id)
    if job["status"] != "ready":
        return jsonify(error="El video aún no está listo"), 400
    body = request.get_json(force=True)
    duration = float(job["duration"])
    clips = []
    for n, c in enumerate(body.get("clips", [])):
        start = max(0.0, float(c["start"]))
        end = min(duration, float(c["end"]))
        if end - start < 0.5:
            return jsonify(error=f"El clip {n + 1} es demasiado corto"), 400
        if end - start > MAX_CLIP_SECONDS + 0.01:
            return jsonify(error=f"El clip {n + 1} supera los 10 minutos"), 400
        clips.append({"start": start, "end": end, "name": safe_name(c.get("name"), f"clip_{n + 1}")})
    if not clips:
        return jsonify(error="No hay clips para exportar"), 400
    export_id = new_id()
    exports[export_id] = {"id": export_id, "job": job_id, "status": "working", "progress": 0,
                          "message": "Preparando…", "files": []}
    threading.Thread(
        target=run_export,
        args=(export_id, job_id, clips, bool(body.get("vertical")), body.get("precise", True)),
        daemon=True,
    ).start()
    return jsonify(id=export_id)


@app.get("/api/exports/<export_id>")
def api_export_status(export_id):
    exp = exports.get(export_id) or abort(404)
    return jsonify(exp)


@app.get("/api/exports/<export_id>/zip")
def api_export_zip(export_id):
    exp = exports.get(export_id) or abort(404)
    folder = os.path.join(job_dir(exp["job"]), "clips", export_id)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_STORED) as z:
        for f in exp["files"]:
            z.write(os.path.join(folder, f["name"]), f["name"])
    buf.seek(0)
    title = safe_name(jobs[exp["job"]].get("title"), "clips")
    return send_file(buf, mimetype="application/zip", as_attachment=True, download_name=f"{title}_clips.zip")


@app.get("/")
def index():
    return render_template("index.html", max_clip=MAX_CLIP_SECONDS)


if __name__ == "__main__":
    app.run(host=os.environ.get("HOST", "127.0.0.1"), port=int(os.environ.get("PORT", 5000)), debug=False)
