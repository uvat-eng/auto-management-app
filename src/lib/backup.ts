import { Car } from "@/lib/fleet";

const FORMAT = "avtopark-backup";

interface Backup {
  format: typeof FORMAT;
  version: 1;
  createdAt: string;
  login?: string;
  cars: Car[];
  files: Record<string, string>;
}

const collectUrls = (v: unknown, out: Set<string>) => {
  if (typeof v === "string") {
    if (/^https:\/\/cdn\.poehali\.dev\//.test(v)) out.add(v);
  } else if (Array.isArray(v)) v.forEach((x) => collectUrls(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => collectUrls(x, out));
};

const toDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

export const makeBackup = async (cars: Car[], login: string | undefined, onProgress: (done: number, total: number) => void) => {
  const urls = new Set<string>();
  collectUrls(cars, urls);
  const list = [...urls];
  const files: Record<string, string> = {};
  let done = 0;
  onProgress(0, list.length);
  const queue = [...list];
  const worker = async () => {
    while (queue.length) {
      const url = queue.shift()!;
      try {
        const res = await fetch(url);
        if (res.ok) files[url] = await toDataUrl(await res.blob());
      } catch {
        /* фото останется ссылкой */
      }
      onProgress(++done, list.length);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  const data: Backup = { format: FORMAT, version: 1, createdAt: new Date().toISOString(), login, cars, files };
  const date = new Date().toISOString().slice(0, 10);
  return new File([JSON.stringify(data)], `avtopark-${date}.avtopark`, { type: "application/json" });
};

const replaceUrls = <T,>(v: T, files: Record<string, string>): T => {
  if (typeof v === "string") return (files[v] ?? v) as T;
  if (Array.isArray(v)) return v.map((x) => replaceUrls(x, files)) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, replaceUrls(x, files)])) as T;
  return v;
};

export const readBackup = async (file: File): Promise<{ cars: Car[]; createdAt: string }> => {
  let data: Backup;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error("Это не файл резервной копии");
  }
  if (data?.format !== FORMAT || !Array.isArray(data.cars)) throw new Error("Это не файл резервной копии «Автопарка»");
  return { cars: data.cars.map((c) => replaceUrls(c, data.files ?? {})), createdAt: data.createdAt };
};

interface NativeBridge {
  shareFile: (name: string, base64: string) => void;
  saveFile: (name: string, base64: string) => string;
}

const native = () => (window as unknown as { AvtoparkNative?: NativeBridge }).AvtoparkNative;

export const shareOrDownload = async (file: File, mode: "share" | "save") => {
  const bridge = native();
  if (bridge) {
    const b64 = (await toDataUrl(file)).split(",")[1];
    if (mode === "share") {
      bridge.shareFile(file.name, b64);
      return "shared";
    }
    const res = bridge.saveFile(file.name, b64);
    if (res !== "ok") throw new Error(res || "Не удалось сохранить файл");
    return "saved";
  }
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (mode === "share" && nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "Резервная копия «Автопарк»", text: "Мои машины, ТО и документы" });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return "saved";
};

export const formatSize = (bytes: number) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} МБ` : `${Math.max(1, Math.round(bytes / 1024))} КБ`);
