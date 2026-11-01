import os, re, subprocess, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from script import CHAPTERS

SRC = sys.argv[1]
FREEZE = sys.argv[2]
OUT = sys.argv[3]
W = os.path.join(os.path.dirname(__file__), "work"); os.makedirs(W, exist_ok=True)
FONT = "/usr/share/fonts/opentype/inter/Inter-Regular.otf"
FONTB = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
FPS = 30
KEEP_FREEZE = 0.8   # seconds of each idle pause we keep
MAX_SPEED = 3.0
GAP = 0.35          # silence between sentences
LEAD = 0.5          # silence at chapter start
TAIL = 0.6          # silence at chapter end
VW, VH = 1548, 960  # app recording area on the 1920x1080 canvas
VX, VY = (1920 - VW) // 2, 6
BAND_Y = 972

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print(" ".join(cmd)); print(r.stderr[-3000:]); sys.exit(1)
    return r.stdout

def dur(p):
    return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]).strip())

# --- idle periods (freezes) detected by ffmpeg freezedetect
fr, cur = [], None
for line in open(FREEZE):
    m = re.search(r"freeze_start=([\d.]+)", line)
    if m: cur = float(m.group(1))
    m = re.search(r"freeze_end=([\d.]+)", line)
    if m and cur is not None: fr.append((cur, float(m.group(1)))); cur = None
if cur is not None: fr.append((cur, 1e9))

def keep_intervals(a, b):
    """Range [a,b] minus idle time (each pause shortened to KEEP_FREEZE)."""
    out, t = [], a
    for s, e in fr:
        if e <= a or s >= b: continue
        s2 = max(s, a) + KEEP_FREEZE; e2 = min(e, b)
        if s2 < e2:
            if s2 > t: out.append((t, s2))
            t = max(t, e2)
    if t < b: out.append((t, b))
    return [(x, y) for x, y in out if y - x > 0.05]

def tts(text, path):
    # flite (offline) voice, cleaned up a bit
    raw = path + ".raw.wav"
    run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"flite=textfile={text}:voice=slt", raw])
    run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af",
         "highpass=f=90,lowpass=f=7000,atempo=0.97,aresample=48000", "-ac", "1", path])

def esc(s):
    return s.replace("\\", "\\\\").replace(":", "\\:").replace("'", "’").replace("%", "\\%")

def wrap(s, n=92):
    words, lines, cur = s.split(), [], ""
    for w in words:
        if len(cur) + len(w) + 1 > n: lines.append(cur); cur = w
        else: cur = (cur + " " + w).strip()
    lines.append(cur); return lines

segs = []
srt, clock = [], 0.0
for ci, ch in enumerate(CHAPTERS):
    # 1) narration audio, sentence by sentence
    parts, timings, t = [], [], LEAD
    for si, line in enumerate(ch["lines"]):
        tf = f"{W}/c{ci}_{si}.txt"; open(tf, "w").write(line)
        wav = f"{W}/c{ci}_{si}.wav"; tts(tf, wav)
        d = dur(wav); timings.append((t, t + d, line)); parts.append((wav, t)); t += d + GAP
    A = t - GAP + TAIL
    inputs, mix = [], []
    for i, (wav, st) in enumerate(parts):
        inputs += ["-i", wav]; mix.append(f"[{i}]adelay={int(st*1000)}:all=1[a{i}]")
    mix.append("".join(f"[a{i}]" for i in range(len(parts))) + f"amix=inputs={len(parts)}:normalize=0,apad,atrim=0:{A:.3f}[ao]")
    aud = f"{W}/c{ci}.wav"
    run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(mix), "-map", "[ao]", "-ar", "48000", "-ac", "2", aud])

    # 2) video
    vid = f"{W}/c{ci}_v.mp4"
    if ch.get("card"):
        bg = ("[0]scale=1920:-2,crop=1920:1080,boxblur=18:2,eq=brightness=-0.32:saturation=0.6,"
              f"loop=-1:1,fps={FPS},trim=0:{A:.3f},setpts=PTS-STARTPTS[v]")
        run(["ffmpeg", "-v", "error", "-y", "-ss", "200", "-i", SRC, "-frames:v", "1", f"{W}/bgframe.png"])
        sub = "Supervisor Panel  •  How-to guide" if ci == 0 else "Supervisor Panel"
        title = "Supervisor Panel Tutorial" if ci == 0 else ch["title"]
        fc = (bg + f";[v]drawtext=fontfile={FONTB}:text='{esc(title)}':fontsize=84:fontcolor=white:x=(w-tw)/2:y=(h-th)/2-50,"
              f"drawtext=fontfile={FONT}:text='{esc(sub)}':fontsize=38:fontcolor=0xF5C542:x=(w-tw)/2:y=(h)/2+40,format=yuv420p[vo]")
        run(["ffmpeg", "-v", "error", "-y", "-i", f"{W}/bgframe.png", "-filter_complex", fc, "-map", "[vo]",
             "-r", str(FPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", vid])
    else:
        keeps = [iv for a, b in ch["ranges"] for iv in keep_intervals(a, b)]
        V = sum(y - x for x, y in keeps)
        speed = min(max(V / max(A, 0.1), 1.0), MAX_SPEED)
        Vs = V / speed
        hold = max(A - Vs, 0)
        A_final = max(A, Vs)
        trims = ";".join(f"[0:v]trim={x:.3f}:{y:.3f},setpts=PTS-STARTPTS[s{i}]" for i, (x, y) in enumerate(keeps))
        cat = "".join(f"[s{i}]" for i in range(len(keeps))) + f"concat=n={len(keeps)}:v=1:a=0[c]"
        dt = []
        for (s, e, line) in timings:
            for li, l in enumerate(reversed(wrap(line))):
                dt.append(f"drawtext=fontfile={FONT}:text='{esc(l)}':fontsize=31:fontcolor=white:"
                          f"x=(w-tw)/2:y={1080-34-li*40}-th:enable='between(t,{s:.2f},{e+GAP:.2f})'")
        fc = (trims + ";" + cat + f";[c]setpts=PTS/{speed:.4f},fps={FPS},scale={VW}:{VH}:flags=lanczos,"
              f"tpad=stop_mode=clone:stop_duration={hold+0.05:.3f}[app];"
              f"color=c=0x15202E:s=1920x1080:r={FPS}:d={A_final:.3f}[bg];"
              f"[bg][app]overlay={VX}:{VY}:shortest=1,"
              f"drawbox=x=0:y={BAND_Y}:w=1920:h={1080-BAND_Y}:color=0x0E1622:t=fill,"
              f"drawbox=x=0:y={BAND_Y}:w=1920:h=3:color=0xF5C542:t=fill,"
              f"drawtext=fontfile={FONTB}:text='{esc(ch['title'])}':fontsize=22:fontcolor=0xF5C542:x=24:y={BAND_Y+12},"
              + ",".join(dt) + ",format=yuv420p[vo]")
        run(["ffmpeg", "-v", "error", "-y", "-i", SRC, "-filter_complex", fc, "-map", "[vo]",
             "-t", f"{A_final:.3f}", "-r", str(FPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", vid])
        print(f"{ch['title']}: raw {sum(b-a for a,b in ch['ranges']):.0f}s -> idle-trimmed {V:.1f}s, speed x{speed:.2f}, final {A_final:.1f}s")
        A = A_final
    seg = f"{W}/seg{ci:02d}.mp4"
    run(["ffmpeg", "-v", "error", "-y", "-i", vid, "-i", aud, "-af", "apad", "-t", f"{A:.3f}",
         "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", seg])
    segs.append(seg)
    for (s, e, line) in timings:
        srt.append((clock + s, clock + e + GAP, line))
    clock += dur(seg)

open(f"{W}/list.txt", "w").write("".join(f"file '{s}'\n" for s in segs))
run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{W}/list.txt",
     "-c:v", "copy", "-af", "loudnorm=I=-16:TP=-1.5", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", OUT])

def ts(x):
    h, r = divmod(x, 3600); m, s = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int((s % 1) * 1000):03d}"
with open(os.path.splitext(OUT)[0] + ".srt", "w") as f:
    for i, (s, e, l) in enumerate(srt, 1):
        f.write(f"{i}\n{ts(s)} --> {ts(e)}\n{l}\n\n")
print("TOTAL", dur(OUT))
