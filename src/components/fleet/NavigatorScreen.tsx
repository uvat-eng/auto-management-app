import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Icon from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import OfflineMapsDialog from "./OfflineMapsDialog";
import { LAYERS, Place, Route, buildRoute, distance, formatDist, formatDur, makeLayer, searchPlaces } from "@/lib/maps";
import { toast } from "sonner";
import { isMuted, lowerFirst, say, setMuted, spokenDistance, voiceSupported } from "@/lib/voice";

const LAYER_KEY = "avtopark-map-layer";

const dot = (cls: string) => L.divIcon({ className: "", html: `<span class="${cls}"></span>`, iconSize: [22, 22], iconAnchor: [11, 11] });

const formatDurSpoken = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return `В пути ${h ? `${h} ч ` : ""}${m} мин`;
};

const NavigatorScreen = () => {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const tiles = useRef<L.TileLayer | null>(null);
  const base = useRef<L.TileLayer | null>(null);
  const [zoom, setZoom] = useState(5);
  const [tileErrors, setTileErrors] = useState(0);
  const me = useRef<L.Marker | null>(null);
  const dest = useRef<L.Marker | null>(null);
  const line = useRef<L.Polyline | null>(null);
  const watch = useRef<number | null>(null);

  const [layerId, setLayerId] = useState(() => localStorage.getItem(LAYER_KEY) || "osm");
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [follow, setFollow] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [target, setTarget] = useState<Place | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [driving, setDriving] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [layersOpen, setLayersOpen] = useState(false);
  const [offline, setOffline] = useState(false);
  const [muted, setMutedState] = useState(isMuted);
  const spoken = useRef<Record<string, boolean>>({});

  const layer = LAYERS.find((l) => l.id === layerId) ?? LAYERS[0];

  useEffect(() => {
    if (!box.current || map.current) return;
    const m = L.map(box.current, { zoomControl: false, attributionControl: true }).setView([55.75, 37.62], 5);
    m.attributionControl.setPrefix(false);
    m.on("dragstart", () => setFollow(false));
    m.on("zoomend", () => setZoom(m.getZoom()));
    m.on("click", (e: L.LeafletMouseEvent) => {
      const p = { name: `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`, lat: e.latlng.lat, lon: e.latlng.lng };
      setTarget(p);
      setResults([]);
    });
    map.current = m;
    setTimeout(() => m.invalidateSize(), 50);

    if ("geolocation" in navigator) {
      watch.current = navigator.geolocation.watchPosition(
        (p) => setPos([p.coords.latitude, p.coords.longitude]),
        () => toast.message("Разрешите доступ к геопозиции, чтобы видеть себя на карте"),
        { enableHighAccuracy: true, maximumAge: 3000 },
      );
    }
    return () => {
      if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    tiles.current?.remove();
    base.current?.remove();
    base.current = layer.overlay ? makeLayer(LAYERS[0]).addTo(m) : null;
    setTileErrors(0);
    let ok = 0;
    tiles.current = makeLayer(layer)
      .on("tileload", () => {
        ok++;
        setTileErrors(0);
      })
      .on("tileerror", () => !ok && setTileErrors((n) => n + 1))
      .addTo(m);
    localStorage.setItem(LAYER_KEY, layer.id);
  }, [layer]);

  useEffect(() => {
    const m = map.current;
    if (!m || !pos) return;
    if (!me.current) {
      me.current = L.marker(pos, { icon: dot("nav-me") }).addTo(m);
      m.setView(pos, 14);
    } else me.current.setLatLng(pos);
    if (follow) m.panTo(pos, { animate: true });
  }, [pos, follow]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    dest.current?.remove();
    dest.current = target ? L.marker([target.lat, target.lon], { icon: dot("nav-dest") }).addTo(m) : null;
    if (target && !route) m.panTo([target.lat, target.lon]);
  }, [target, route]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    line.current?.remove();
    line.current = route ? L.polyline(route.line, { color: "hsl(42,54%,54%)", weight: 6, opacity: 0.9 }).addTo(m) : null;
    if (route && line.current) m.fitBounds(line.current.getBounds(), { padding: [40, 40] });
  }, [route]);

  useEffect(() => {
    if (!driving || !route || !pos) return;
    let i = stepIdx;
    while (i < route.steps.length - 1 && distance(pos, [route.steps[i].lat, route.steps[i].lon]) < 30) i++;
    if (i !== stepIdx) setStepIdx(i);
    const next = route.steps[Math.min(i + 1, route.steps.length - 1)];
    const d = distance(pos, [next.lat, next.lon]);
    const k = String(i + 1);
    const phrase = lowerFirst(next.text);
    if (d < 60 && !spoken.current[`${k}-now`]) {
      spoken.current[`${k}-now`] = true;
      spoken.current[`${k}-soon`] = true;
      spoken.current[`${k}-far`] = true;
      say(next.text);
    } else if (d < 250 && d >= 60 && !spoken.current[`${k}-soon`]) {
      spoken.current[`${k}-soon`] = true;
      spoken.current[`${k}-far`] = true;
      say(`Через ${spokenDistance(d)} ${phrase}`);
    } else if (d >= 800 && d < 1300 && !spoken.current[`${k}-far`]) {
      spoken.current[`${k}-far`] = true;
      say(`Через ${spokenDistance(d)} ${phrase}`);
    }
    const end = route.line[route.line.length - 1];
    if (distance(pos, end) < 40) {
      toast.success("Вы на месте");
      say("Вы прибыли на место");
      setDriving(false);
    }
  }, [pos, driving, route, stepIdx]);

  const doSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const r = await searchPlaces(query.trim(), pos ?? undefined);
      setResults(r);
      if (!r.length) toast.message("Ничего не нашли");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const makeRoute = async () => {
    if (!target) return;
    if (!pos) return toast.error("Не знаем, где вы — включите геопозицию");
    try {
      const r = await buildRoute(pos, [target.lat, target.lon]);
      setRoute(r);
      setStepIdx(0);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const reset = () => {
    setTarget(null);
    setRoute(null);
    setDriving(false);
    setResults([]);
    setQuery("");
  };

  const startDrive = () => {
    spoken.current = {};
    if (route) {
      const first = route.steps[1] ?? route.steps[0];
      say(`Маршрут построен. ${formatDurSpoken(route.duration)}. ${first ? `Через ${spokenDistance(route.steps[0].distance)} ${lowerFirst(first.text)}` : ""}`);
    }
    setDriving(true);
    setFollow(true);
    if (pos) map.current?.setView(pos, 17);
  };

  const step = route?.steps[driving ? Math.min(stepIdx + 1, route.steps.length - 1) : 0];
  const stepDist = step && pos ? distance(pos, [step.lat, step.lon]) : step?.distance ?? 0;

  return (
    <section className="[grid-area:photo/photo/due/due] relative min-h-0 overflow-hidden bg-background">
      <div ref={box} className="absolute inset-0 z-0 nav-map" />

      {driving && step ? (
        <div className="absolute left-3 right-3 top-3 z-[500] rounded-3xl bg-card/95 backdrop-blur border border-border p-4 flex items-center gap-4 animate-fade-in">
          <span className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground grid place-items-center shrink-0">
            <Icon name="Navigation" size={22} />
          </span>
          <div className="min-w-0">
            <p className="font-head text-2xl font-semibold text-gold leading-none">{formatDist(stepDist)}</p>
            <p className="text-sm mt-1 truncate">{step.text}</p>
          </div>
        </div>
      ) : (
        <div className="absolute left-3 right-3 top-3 z-[500] space-y-2">
          <form onSubmit={doSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Icon name="Search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-muted-foreground pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Куда едем?"
                className="h-12 pl-10 rounded-full bg-card/95 backdrop-blur border-border"
              />
            </div>
            <button type="submit" disabled={searching} className="h-12 w-12 rounded-full bg-primary text-primary-foreground grid place-items-center shrink-0">
              <Icon name={searching ? "Loader" : "ArrowRight"} size={18} className={searching ? "animate-spin" : ""} />
            </button>
          </form>
          {results.length > 0 && (
            <div className="rounded-3xl bg-card/95 backdrop-blur border border-border overflow-hidden max-h-[40dvh] overflow-y-auto">
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setTarget(r);
                    setResults([]);
                    setRoute(null);
                    map.current?.setView([r.lat, r.lon], 13);
                  }}
                  className="w-full text-left px-4 py-3 text-sm border-b border-border last:border-0 hover:bg-secondary"
                >
                  <span className="line-clamp-2">{r.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="absolute right-3 bottom-36 z-[500] flex flex-col gap-2">
        {voiceSupported() && (
          <button
            onClick={() => {
              setMuted(!muted);
              setMutedState(!muted);
              if (muted) say("Голосовые подсказки включены", true);
            }}
            aria-label={muted ? "Включить голос" : "Выключить голос"}
            className={`nav-fab ${muted ? "text-muted-foreground" : "!text-primary"}`}
          >
            <Icon name={muted ? "VolumeX" : "Volume2"} size={20} />
          </button>
        )}
        <button onClick={() => setLayersOpen((v) => !v)} aria-label="Слои карты" className="nav-fab">
          <Icon name="Layers" size={20} />
        </button>
        <button onClick={() => setOffline(true)} aria-label="Карты без интернета" className="nav-fab">
          <Icon name="Download" size={20} />
        </button>
        <button
          onClick={() => {
            setFollow(true);
            if (pos) map.current?.setView(pos, Math.max(map.current.getZoom(), 14));
            else toast.message("Ищем вас… Разрешите доступ к геопозиции");
          }}
          aria-label="Где я"
          className={`nav-fab ${follow && pos ? "!text-primary" : ""}`}
        >
          <Icon name="LocateFixed" size={20} />
        </button>
      </div>

      {layersOpen && (
        <div className="absolute right-16 bottom-36 z-[500] w-64 rounded-3xl bg-card/95 backdrop-blur border border-border p-2 animate-fade-in">
          {LAYERS.map((l) => (
            <button
              key={l.id}
              onClick={() => {
                setLayerId(l.id);
                setLayersOpen(false);
              }}
              className={`w-full text-left rounded-2xl px-3 py-2.5 ${l.id === layerId ? "bg-secondary" : "hover:bg-secondary/60"}`}
            >
              <p className={`text-sm font-medium ${l.id === layerId ? "text-gold" : ""}`}>{l.label}</p>
              <p className="text-xs text-muted-foreground">{l.hint}</p>
            </button>
          ))}
        </div>
      )}

      {layer.overlay && !driving && (zoom < (layer.minZoom ?? 0) || tileErrors > 3) && (
        <div className="absolute left-1/2 -translate-x-1/2 top-[76px] z-[400] px-4 py-2 rounded-full bg-card/95 backdrop-blur border border-border text-xs text-muted-foreground whitespace-nowrap">
          {tileErrors > 3 ? "Карта Генштаба сейчас недоступна — показываем обычную" : "Приблизьте карту, чтобы увидеть Генштаб"}
        </div>
      )}

      {target && (
        <div className="absolute left-3 right-3 bottom-3 z-[500] rounded-3xl bg-card/95 backdrop-blur border border-border p-4 animate-fade-in">
          {route ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-head text-2xl font-semibold leading-none">{formatDur(route.duration)}</p>
                <p className="text-sm text-muted-foreground mt-1">{formatDist(route.distance)}</p>
              </div>
              {driving ? (
                <button
                  onClick={() => {
                    setDriving(false);
                    window.speechSynthesis?.cancel();
                  }}
                  className="h-12 px-5 rounded-full bg-secondary font-medium"
                >
                  Стоп
                </button>
              ) : (
                <button onClick={startDrive} className="h-12 px-5 rounded-full bg-primary text-primary-foreground font-medium inline-flex items-center gap-2">
                  <Icon name="Navigation" size={18} /> Поехали
                </button>
              )}
              <button onClick={reset} aria-label="Сбросить" className="h-12 w-12 rounded-full border border-border grid place-items-center text-muted-foreground">
                <Icon name="X" size={18} />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm line-clamp-2">{target.name}</p>
              <div className="flex gap-2">
                <button onClick={makeRoute} className="flex-1 h-12 rounded-full bg-primary text-primary-foreground font-medium inline-flex items-center justify-center gap-2">
                  <Icon name="Route" size={18} /> Маршрут
                </button>
                <button onClick={reset} aria-label="Сбросить" className="h-12 w-12 rounded-full border border-border grid place-items-center text-muted-foreground">
                  <Icon name="X" size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <OfflineMapsDialog open={offline} onOpenChange={setOffline} layer={layer} pos={pos ?? (map.current ? [map.current.getCenter().lat, map.current.getCenter().lng] : null)} />
    </section>
  );
};

export default NavigatorScreen;
