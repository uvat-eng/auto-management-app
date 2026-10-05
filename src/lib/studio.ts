type Cutout = { width: number; height: number; data: Uint8ClampedArray };

const W = 1440;
const H = 1200;
const BG = "rgb(5,5,5)";
const LIGHTS = [0.5, 0.38, 0.62, 0.5];

let worker: Worker | null = null;
let seq = 0;
const waiting = new Map<number, { resolve: (c: Cutout) => void; reject: (e: Error) => void }>();

const getWorker = () => {
  if (worker) return worker;
  worker = new Worker(new URL("./studio.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (e) => {
    const msg = e.data;
    const job = waiting.get(msg.id);
    if (!job) return;
    waiting.delete(msg.id);
    if (msg.type === "done") job.resolve({ width: msg.width, height: msg.height, data: msg.data });
    else job.reject(new Error("Не удалось распознать машину на фото"));
  };
  worker.onerror = () => {
    waiting.forEach((j) => j.reject(new Error("Не удалось обработать фото")));
    waiting.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
};

const cutout = (image: string) =>
  new Promise<Cutout>((resolve, reject) => {
    const id = ++seq;
    waiting.set(id, { resolve, reject });
    getWorker().postMessage({ id, image });
  });

const keepMain = ({ width, height, data }: Cutout) => {
  const k = 4;
  const gw = Math.ceil(width / k);
  const gh = Math.ceil(height / k);
  const solid = new Uint8Array(gw * gh);
  for (let y = 0; y < height; y += k) {
    for (let x = 0; x < width; x += k) {
      if (data[(y * width + x) * 4 + 3] > 128) solid[(y / k) * gw + x / k] = 1;
    }
  }
  const eroded = new Uint8Array(gw * gh);
  const R = 3;
  for (let y = R; y < gh - R; y++) {
    for (let x = R; x < gw - R; x++) {
      let ok = 1;
      for (let dy = -R; dy <= R && ok; dy++) for (let dx = -R; dx <= R && ok; dx++) if (!solid[(y + dy) * gw + x + dx]) ok = 0;
      eroded[y * gw + x] = ok;
    }
  }
  const label = new Int32Array(gw * gh);
  const stack: number[] = [];
  let best = 0;
  let bestScore = 0;
  let n = 0;
  for (let i = 0; i < eroded.length; i++) {
    if (!eroded[i] || label[i]) continue;
    n++;
    let area = 0;
    let sx = 0;
    stack.push(i);
    label[i] = n;
    while (stack.length) {
      const p = stack.pop()!;
      area++;
      sx += p % gw;
      const px = p % gw;
      const nb = [p - 1, p + 1, p - gw, p + gw];
      for (const q of nb) {
        if (q < 0 || q >= eroded.length || label[q] || !eroded[q]) continue;
        if ((q === p - 1 && px === 0) || (q === p + 1 && px === gw - 1)) continue;
        label[q] = n;
        stack.push(q);
      }
    }
    const centre = 1 - Math.abs(sx / area / gw - 0.5);
    const score = area * centre;
    if (score > bestScore) {
      bestScore = score;
      best = n;
    }
  }
  if (!best) return;
  const keep = new Uint8Array(gw * gh);
  const D = R + 2;
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      if (label[y * gw + x] !== best) continue;
      for (let dy = -D; dy <= D; dy++) {
        for (let dx = -D; dx <= D; dx++) {
          const yy = y + dy;
          const xx = x + dx;
          if (yy >= 0 && yy < gh && xx >= 0 && xx < gw) keep[yy * gw + xx] = 1;
        }
      }
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!keep[Math.floor(y / k) * gw + Math.floor(x / k)]) data[(y * width + x) * 4 + 3] = 0;
    }
  }
};

const bounds = ({ width, height, data }: Cutout) => {
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 40) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
};

const layer = () => {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  return [c, c.getContext("2d")!] as const;
};

const compose = (cut: Cutout, variant: number) => {
  keepMain(cut);
  const box = bounds(cut);
  if (!box || box.w * box.h < cut.width * cut.height * 0.03) {
    throw new Error("Машина на фото не найдена — попробуйте снимок, где она видна целиком");
  }

  const src = document.createElement("canvas");
  src.width = cut.width;
  src.height = cut.height;
  src.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(cut.data), cut.width, cut.height), 0, 0);

  const scale = Math.min((W * 0.74) / box.w, (H * 0.46) / box.h);
  const cw = box.w * scale;
  const ch = box.h * scale;
  const cx = (W - cw) / 2;
  const floor = H * 0.8;
  const cy = floor - ch;
  const lx = W * LIGHTS[variant % LIGHTS.length];
  const draw = (ctx: CanvasRenderingContext2D) => ctx.drawImage(src, box.x, box.y, box.w, box.h, cx, cy, cw, ch);

  const [c, g] = layer();
  g.fillStyle = BG;
  g.fillRect(0, 0, W, H);

  const spot = g.createRadialGradient(lx, floor - ch * 0.6, 0, lx, floor - ch * 0.6, W * 0.62);
  spot.addColorStop(0, "rgba(70,74,84,0.55)");
  spot.addColorStop(0.45, "rgba(30,32,38,0.35)");
  spot.addColorStop(1, "rgba(5,5,5,0)");
  g.fillStyle = spot;
  g.fillRect(0, 0, W, H);

  const glow = g.createRadialGradient(lx, 0, 0, lx, 0, W * 0.55);
  glow.addColorStop(0, "rgba(120,124,135,0.22)");
  glow.addColorStop(1, "rgba(5,5,5,0)");
  g.save();
  g.translate(0, floor);
  g.scale(1, 0.18);
  g.fillStyle = glow;
  g.fillRect(0, -H * 3, W, H * 6);
  g.restore();

  const [refl, r] = layer();
  r.save();
  r.translate(0, floor * 2);
  r.scale(1, -1);
  r.filter = "blur(2px) brightness(0.7) saturate(0.8)";
  draw(r);
  r.restore();
  r.globalCompositeOperation = "destination-in";
  const fade = r.createLinearGradient(0, floor, 0, floor + ch * 0.55);
  fade.addColorStop(0, "rgba(0,0,0,0.32)");
  fade.addColorStop(1, "rgba(0,0,0,0)");
  r.fillStyle = fade;
  r.fillRect(0, 0, W, H);
  g.drawImage(refl, 0, 0);

  g.save();
  g.filter = "blur(18px)";
  g.fillStyle = "rgba(0,0,0,0.85)";
  g.beginPath();
  g.ellipse(W / 2, floor - 4, cw * 0.48, Math.max(ch * 0.06, 8), 0, 0, Math.PI * 2);
  g.fill();
  g.restore();

  g.save();
  g.filter = "contrast(1.12) brightness(0.86) saturate(0.85)";
  draw(g);
  g.restore();

  const [shade, s] = layer();
  draw(s);
  s.globalCompositeOperation = "source-in";
  const tone = s.createLinearGradient(0, cy, 0, floor);
  tone.addColorStop(0, "rgba(255,255,255,0.10)");
  tone.addColorStop(0.35, "rgba(0,0,0,0)");
  tone.addColorStop(1, "rgba(0,0,0,0.45)");
  s.fillStyle = tone;
  s.fillRect(0, 0, W, H);
  g.drawImage(shade, 0, 0);

  const vignette = g.createRadialGradient(W / 2, H * 0.62, W * 0.3, W / 2, H * 0.62, W * 0.78);
  vignette.addColorStop(0, "rgba(5,5,5,0)");
  vignette.addColorStop(1, "rgba(5,5,5,1)");
  g.fillStyle = vignette;
  g.fillRect(0, 0, W, H);

  const edge = g.createLinearGradient(0, 0, 0, H);
  edge.addColorStop(0, "rgba(5,5,5,1)");
  edge.addColorStop(0.12, "rgba(5,5,5,0)");
  edge.addColorStop(0.9, "rgba(5,5,5,0)");
  edge.addColorStop(1, "rgba(5,5,5,1)");
  g.fillStyle = edge;
  g.fillRect(0, 0, W, H);

  return c.toDataURL("image/jpeg", 0.85);
};

export const makeStudioPhoto = async (image: string, variant = 0) => compose(await cutout(image), variant);