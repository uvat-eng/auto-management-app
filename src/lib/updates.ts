export const APP_VERSION = { code: 6, name: "1.5" };

interface Remote {
  versionCode: number;
  versionName: string;
  url: string;
  notes?: string;
}

const SITE_KEY = "avtopark-site";

interface NativeInfo {
  versionCode?: () => number;
  siteUrl?: () => string;
  openUrl?: (url: string) => void;
}

const native = () => (window as unknown as { AvtoparkNative?: NativeInfo }).AvtoparkNative;

export const isAndroidApp = () => !!native();

export const installedVersion = () => native()?.versionCode?.() ?? APP_VERSION.code;

const siteBase = () => {
  if (!isAndroidApp()) return location.origin;
  return native()?.siteUrl?.() || localStorage.getItem(SITE_KEY) || "";
};

export const setSiteBase = (url: string) => localStorage.setItem(SITE_KEY, url.replace(/\/+$/, ""));
export const getSiteBase = siteBase;

export const checkUpdate = async (): Promise<(Remote & { available: boolean; fullUrl: string }) | null> => {
  const base = siteBase();
  if (!base) return null;
  const res = await fetch(`${base}/app-version.json?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Сервер обновлений не отвечает");
  const r = (await res.json()) as Remote;
  return { ...r, available: r.versionCode > installedVersion(), fullUrl: new URL(r.url, base).toString() };
};

export const openDownload = (url: string) => {
  const n = native();
  if (n?.openUrl) n.openUrl(url);
  else window.open(url, "_blank");
};
