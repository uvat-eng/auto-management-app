import L from "leaflet";

export interface MapLayer {
  id: string;
  label: string;
  hint: string;
  url: string;
  tms?: boolean;
  subdomains?: string;
  maxNativeZoom: number;
  minZoom?: number;
  overlay?: boolean;
  attribution: string;
}

export const LAYERS: MapLayer[] = [
  {
    id: "osm",
    label: "Дороги",
    hint: "Обычная карта, актуальные дороги",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxNativeZoom: 19,
    attribution: "© OpenStreetMap",
  },
  {
    id: "ggc1000",
    label: "Генштаб 1 км",
    hint: "Карты Генштаба, масштаб 1 км — вся Россия",
    url: "https://{s}.tiles.nakarte.me/ggc1000/{z}/{x}/{y}",
    tms: true,
    overlay: true,
    minZoom: 8,
    subdomains: "abc",
    maxNativeZoom: 13,
    attribution: "Генштаб © nakarte.me",
  },
  {
    id: "ggc500",
    label: "Генштаб 500 м",
    hint: "Подробнее, есть не везде",
    url: "https://{s}.tiles.nakarte.me/ggc500/{z}/{x}/{y}",
    tms: true,
    overlay: true,
    minZoom: 8,
    subdomains: "abc",
    maxNativeZoom: 14,
    attribution: "Генштаб © nakarte.me",
  },
  {
    id: "topo",
    label: "Рельеф",
    hint: "Топокарта с высотами и грунтовками",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    subdomains: "abc",
    maxNativeZoom: 17,
    attribution: "© OpenTopoMap",
  },
];

const DB = "avtopark-tiles";
const STORE = "tiles";

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

let dbPromise: Promise<IDBDatabase> | null = null;
const db = () => (dbPromise ??= openDb());

const getTile = async (key: string) => {
  const d = await db();
  return new Promise<Blob | null>((resolve) => {
    const req = d.transaction(STORE, "readonly").objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror = () => resolve(null);
  });
};

const putTile = async (key: string, blob: Blob) => {
  const d = await db();
  return new Promise<void>((resolve) => {
    const tx = d.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
};

export const countTiles = async () => {
  const d = await db();
  return new Promise<number>((resolve) => {
    const req = d.transaction(STORE, "readonly").objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(0);
  });
};

export const clearTiles = async () => {
  const d = await db();
  return new Promise<void>((resolve) => {
    const tx = d.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
  });
};

const tileUrl = (layer: MapLayer, z: number, x: number, y: number) => {
  const yy = layer.tms ? (1 << z) - 1 - y : y;
  const sub = layer.subdomains ? layer.subdomains[(x + y) % layer.subdomains.length] : "";
  return layer.url.replace("{s}", sub).replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(yy));
};

const keyOf = (layer: MapLayer, z: number, x: number, y: number) => `${layer.id}/${z}/${x}/${y}`;

export const OfflineTileLayer = L.TileLayer.extend({
  createTile(this: L.TileLayer & { _layer: MapLayer }, coords: L.Coords, done: L.DoneCallback) {
    const img = document.createElement("img");
    img.alt = "";
    img.setAttribute("role", "presentation");
    const layer = this._layer;
    const { z, x, y } = coords;
    const key = keyOf(layer, z, x, y);
    getTile(key).then((cached) => {
      if (cached) {
        img.onload = () => {
          URL.revokeObjectURL(img.src);
          done(undefined, img);
        };
        img.onerror = () => done(new Error("tile"), img);
        img.src = URL.createObjectURL(cached);
        return;
      }
      img.onload = () => done(undefined, img);
      img.onerror = () => done(new Error("tile"), img);
      img.src = tileUrl(layer, z, x, y);
    });
    return img;
  },
});

export const makeLayer = (layer: MapLayer) => {
  const tl = new (OfflineTileLayer as unknown as new (url: string, o: L.TileLayerOptions) => L.TileLayer)(layer.url, {
    maxNativeZoom: layer.maxNativeZoom,
    minZoom: layer.minZoom ?? 0,
    maxZoom: 19,
    attribution: layer.attribution,
  });
  (tl as unknown as { _layer: MapLayer })._layer = layer;
  return tl;
};

const lon2x = (lon: number, z: number) => Math.floor(((lon + 180) / 360) * 2 ** z);
const lat2y = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
};

export const planDownload = (layer: MapLayer, lat: number, lon: number, radiusKm: number) => {
  const dLat = radiusKm / 111;
  const dLon = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  const maxZ = Math.min(layer.maxNativeZoom, radiusKm > 30 ? 13 : 15);
  const list: [number, number, number][] = [];
  for (let z = Math.max(6, layer.minZoom ?? 0); z <= maxZ; z++) {
    const x0 = lon2x(lon - dLon, z);
    const x1 = lon2x(lon + dLon, z);
    const y0 = lat2y(lat + dLat, z);
    const y1 = lat2y(lat - dLat, z);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) list.push([z, x, y]);
  }
  return list;
};

export const downloadArea = async (
  layer: MapLayer,
  tiles: [number, number, number][],
  onProgress: (done: number) => void,
  signal: AbortSignal,
) => {
  let done = 0;
  let failed = 0;
  const queue = [...tiles];
  const worker = async () => {
    while (queue.length && !signal.aborted) {
      const [z, x, y] = queue.shift()!;
      const key = keyOf(layer, z, x, y);
      if (!(await getTile(key))) {
        try {
          const res = await fetch(tileUrl(layer, z, x, y), { signal });
          if (res.ok) await putTile(key, await res.blob());
          else failed++;
        } catch {
          failed++;
        }
      }
      onProgress(++done);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  return { done, failed };
};

export interface Place {
  name: string;
  lat: number;
  lon: number;
}

export const searchPlaces = async (q: string, near?: [number, number]): Promise<Place[]> => {
  const params = new URLSearchParams({ q, format: "json", limit: "6", "accept-language": "ru", countrycodes: "ru,by,kz,ab" });
  if (near) params.set("viewbox", `${near[1] - 2},${near[0] + 2},${near[1] + 2},${near[0] - 2}`);
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
  if (!res.ok) throw new Error("Поиск недоступен");
  const data = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return data.map((d) => ({ name: d.display_name, lat: Number(d.lat), lon: Number(d.lon) }));
};

export interface Step {
  text: string;
  distance: number;
  lat: number;
  lon: number;
}

export interface Route {
  line: [number, number][];
  distance: number;
  duration: number;
  steps: Step[];
}

const TURN: Record<string, string> = {
  left: "налево",
  right: "направо",
  "slight left": "плавно налево",
  "slight right": "плавно направо",
  "sharp left": "резко налево",
  "sharp right": "резко направо",
  uturn: "разворот",
  straight: "прямо",
};

const stepText = (s: { maneuver: { type: string; modifier?: string; exit?: number }; name: string }) => {
  const m = s.maneuver;
  const where = s.name ? ` на ${s.name}` : "";
  const turn = m.modifier ? TURN[m.modifier] ?? "" : "";
  if (m.type === "depart") return `Начните движение${where}`;
  if (m.type === "arrive") return "Вы на месте";
  if (m.type === "roundabout" || m.type === "rotary") return `На кольце — ${m.exit ?? ""}-й съезд${where}`;
  if (m.type === "merge") return `Перестройтесь${where}`;
  if (m.type === "fork") return `Держитесь ${turn || "прямо"}${where}`;
  if (m.type === "on ramp") return `Съезд ${turn}${where}`;
  if (m.type === "off ramp") return `Съезжайте ${turn}${where}`;
  if (m.type === "continue" || m.type === "new name") return `Продолжайте ${turn || "прямо"}${where}`;
  return `${turn ? turn[0].toUpperCase() + turn.slice(1) : "Прямо"}${where}`;
};

export const buildRoute = async (from: [number, number], to: [number, number]): Promise<Route> => {
  const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.length) throw new Error("Маршрут не найден");
  const r = data.routes[0];
  return {
    line: r.geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon]),
    distance: r.distance,
    duration: r.duration,
    steps: r.legs[0].steps.map((s: { distance: number; name: string; maneuver: { type: string; modifier?: string; exit?: number; location: [number, number] } }) => ({
      text: stepText(s),
      distance: s.distance,
      lon: s.maneuver.location[0],
      lat: s.maneuver.location[1],
    })),
  };
};

export const formatDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(m >= 10000 ? 0 : 1)} км` : `${Math.round(m / 10) * 10} м`);
export const formatDur = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h} ч ${m} мин` : `${m} мин`;
};

export const distance = (a: [number, number], b: [number, number]) => {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
