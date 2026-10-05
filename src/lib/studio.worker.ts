import { pipeline, env, RawImage } from "@huggingface/transformers";

env.allowLocalModels = false;

type Remover = (input: string) => Promise<RawImage>;
let remover: Promise<Remover> | null = null;

const load = () => {
  if (!remover) {
    remover = pipeline("background-removal", "onnx-community/ormbg-ONNX", {
      dtype: "q8",
      progress_callback: (p: { status: string; progress?: number }) => {
        if (p.status === "progress" && typeof p.progress === "number") self.postMessage({ type: "progress", value: p.progress });
      },
    }) as unknown as Promise<Remover>;
  }
  return remover;
};

self.onmessage = async (e: MessageEvent<{ id: number; image: string }>) => {
  const { id, image } = e.data;
  try {
    const run = await load();
    const out = await run(image);
    const rgba = out.channels === 4 ? out : out.rgba();
    const data = new Uint8ClampedArray(rgba.data);
    self.postMessage({ type: "done", id, width: rgba.width, height: rgba.height, data }, { transfer: [data.buffer] });
  } catch (err) {
    remover = null;
    self.postMessage({ type: "error", id, message: (err as Error).message });
  }
};
