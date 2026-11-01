import sys, numpy as np, soundfile as sf, glob, os
from kokoro_onnx import Kokoro
V="/tmp/kk/js/package/voices"
npz="/tmp/kk/voices.npz"
if not os.path.exists(npz):
    np.savez(npz, **{os.path.basename(p)[:-4]: np.fromfile(p, dtype=np.float32).reshape(-1,1,256) for p in glob.glob(V+"/*.bin")})
k = Kokoro("/tmp/kk/model_quantized.onnx", npz)
voice, speed = sys.argv[1], float(sys.argv[2])
for line in sys.stdin:
    out, text = line.rstrip("\n").split("\t", 1)
    a, sr = k.create(text, voice=voice, speed=speed, lang="en-us")
    sf.write(out, a, sr)
