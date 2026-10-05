import base64
import io
import json
import time

import numpy as np
from PIL import Image

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
    "Access-Control-Max-Age": "86400",
}
SIZE = 320
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)
_sessions = {}
MODELS = {
    "fast": ("https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx", 4_000_000),
    "best": ("https://github.com/danielgatis/rembg/releases/download/v0.0.0/silueta.onnx", 40_000_000),
}


def session(kind: str = "fast"):
    if kind not in _sessions:
        import os
        import onnxruntime as ort

        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 1
        opts.inter_op_num_threads = 1
        opts.enable_cpu_mem_arena = False
        opts.enable_mem_pattern = False
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_BASIC
        url, min_size = MODELS[kind]
        path = f"/tmp/{kind}.onnx"
        if not os.path.exists(path) or os.path.getsize(path) < min_size:
            import urllib.request

            urllib.request.urlretrieve(url, path + ".part")
            os.replace(path + ".part", path)
        _sessions[kind] = ort.InferenceSession(path, opts, providers=["CPUExecutionProvider"])
    return _sessions[kind]


def reply(code: int, data: dict) -> dict:
    return {"statusCode": code, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(data)}


def handler(event: dict, context) -> dict:
    """Вырезает машину с фото: возвращает маску (PNG) для студийной обложки."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}
    q = event.get("queryStringParameters") or {}
    kind = q.get("model") if q.get("model") in MODELS else "fast"
    if event.get("httpMethod") == "GET":
        t = time.time()
        session(kind)
        return reply(200, {"ok": True, "load": round(time.time() - t, 2)})

    body = json.loads(event.get("body") or "{}")
    raw = str(body.get("image") or "")
    if "," in raw[:100]:
        raw = raw.split(",", 1)[1]
    if not raw:
        return reply(400, {"error": "Нет фото"})
    img = Image.open(io.BytesIO(base64.b64decode(raw)))
    img.draft("RGB", (SIZE * 2, SIZE * 2))
    img = img.convert("RGB")
    w, h = img.size
    raw = None

    x = np.asarray(img.resize((SIZE, SIZE), Image.LANCZOS), dtype=np.float32) / 255.0
    x = ((x - MEAN) / STD).transpose(2, 0, 1)[None].astype(np.float32)
    s = session(kind)
    t = time.time()
    out = s.run(None, {s.get_inputs()[0].name: x})[0][0][0]
    print(f"model={kind} run={time.time() - t:.2f}s size={w}x{h}")
    lo, hi = float(out.min()), float(out.max())
    mask = (out - lo) / (hi - lo + 1e-8)
    m = Image.fromarray((mask * 255).astype(np.uint8), "L")

    buf = io.BytesIO()
    m.save(buf, "PNG", optimize=True)
    return reply(200, {"mask": "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode(), "width": w, "height": h})
