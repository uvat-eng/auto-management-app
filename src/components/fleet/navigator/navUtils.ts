import L from "leaflet";

export const LAYER_KEY = "avtopark-map-layer";
export const MODE_KEY = "avtopark-map-mode";
export type Mode = "north" | "course";

export const meIcon = () =>
  L.divIcon({ className: "", html: `<div class="nav-me-wrap"><span class="nav-me-cone"></span><span class="nav-me"></span></div>`, iconSize: [44, 44], iconAnchor: [22, 22] });

export const bearing = (a: [number, number], b: [number, number]) => {
  const r = Math.PI / 180;
  const y = Math.sin((b[1] - a[1]) * r) * Math.cos(b[0] * r);
  const x = Math.cos(a[0] * r) * Math.sin(b[0] * r) - Math.sin(a[0] * r) * Math.cos(b[0] * r) * Math.cos((b[1] - a[1]) * r);
  return ((Math.atan2(y, x) / r) + 360) % 360;
};

export const dot = (cls: string) => L.divIcon({ className: "", html: `<span class="${cls}"></span>`, iconSize: [22, 22], iconAnchor: [11, 11] });

export const formatDurSpoken = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return `В пути ${h ? `${h} ч ` : ""}${m} мин`;
};
