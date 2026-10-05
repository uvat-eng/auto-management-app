import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { Car, today } from "@/lib/fleet";
import { makeStudioPhoto } from "@/lib/studio";
import { AuthError, garageApi } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const DB_NAME = "tvoy-avtopark";
const STORE = "kv";
const LEGACY_KEY = "cars";
const DEMO_IDS = ["car-s500", "car-lc100", "car-e38"];

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const readKey = async <T,>(key: string): Promise<T | null> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error);
  });
};

const writeKey = async (key: string, value: unknown) => {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    if (value === undefined) tx.objectStore(STORE).delete(key);
    else tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const collectLocal = (v: unknown, out: Set<string>) => {
  if (typeof v === "string") {
    if (v.startsWith("data:image")) out.add(v);
  } else if (Array.isArray(v)) v.forEach((x) => collectLocal(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => collectLocal(x, out));
};

const replaceLocal = <T,>(v: T, map: Map<string, string>): T => {
  if (typeof v === "string") return (map.get(v) ?? v) as T;
  if (Array.isArray(v)) return v.map((x) => replaceLocal(x, map)) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, replaceLocal(x, map)])) as T;
  return v;
};

export type SyncState = "idle" | "saving" | "offline";

interface FleetCtx {
  cars: Car[];
  archived: Car[];
  ready: boolean;
  sync: SyncState;
  addCar: (car: Car) => void;
  updateCar: (id: string, patch: Partial<Car> | ((c: Car) => Partial<Car>)) => void;
  removeCar: (id: string) => void;
  archiveCar: (id: string, value: boolean) => void;
  logMileage: (id: string, km: number) => void;
  all: Car[];
  importCars: (list: Car[]) => { added: number; updated: number };
  stylize: (car: Car, source?: string) => void;
}

const Ctx = createContext<FleetCtx | null>(null);

export const FleetProvider = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();
  const cacheKey = user ? `cars-${user.id}` : "";
  const [all, setAll] = useState<Car[]>([]);
  const [ready, setReady] = useState(false);
  const [sync, setSync] = useState<SyncState>("idle");
  const loaded = useRef(false);
  const latest = useRef<Car[]>([]);
  const dirty = useRef(new Set<string>());
  const uploaded = useRef(new Map<string, string>());
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const flushing = useRef(false);

  latest.current = all;

  const mark = (id: string) => dirty.current.add(id);

  const flush = useCallback(async () => {
    if (flushing.current || !dirty.current.size) return;
    flushing.current = true;
    setSync("saving");
    const ids = [...dirty.current];
    dirty.current.clear();
    const failed: string[] = [];
    let authLost = false;
    for (const id of ids) {
      const car = latest.current.find((c) => c.id === id);
      if (!car) continue;
      try {
        const local = new Set<string>();
        collectLocal(car, local);
        for (const src of local) {
          if (!uploaded.current.has(src)) uploaded.current.set(src, await garageApi.upload(src));
        }
        if (local.size) setAll((p) => p.map((c) => (c.id === id ? replaceLocal(c, uploaded.current) : c)));
        const { heroStatus: _s, ...clean } = replaceLocal(car, uploaded.current);
        await garageApi.save(clean as Car);
      } catch (e) {
        if (e instanceof AuthError) authLost = true;
        failed.push(id);
      }
    }
    failed.forEach(mark);
    flushing.current = false;
    if (authLost) {
      toast.error("Сессия истекла — войдите снова, данные сохранятся");
      logout();
      return;
    }
    setSync(failed.length ? "offline" : "idle");
    if (failed.length) timer.current = setTimeout(() => flush(), 15000);
    else if (dirty.current.size) flush();
  }, [logout]);

  const schedule = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => flush(), 1200);
  }, [flush]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    loaded.current = false;
    setReady(false);
    setAll([]);
    (async () => {
      const cached = await readKey<Car[]>(cacheKey).catch(() => null);
      if (cached && alive) {
        setAll(cached.map((c) => (c.heroStatus === "pending" ? { ...c, heroStatus: "error" as const } : c)));
        setReady(true);
      }
      try {
        const remote = await garageApi.list();
        if (!alive) return;
        let list = remote;
        if (!remote.length) {
          const legacy = await readKey<Car[]>(LEGACY_KEY).catch(() => null);
          const own = (legacy ?? []).filter((c) => !DEMO_IDS.includes(c.id));
          if (own.length) {
            list = own.map((c) => ({ ...c, heroStatus: undefined }));
            own.forEach((c) => mark(c.id));
            await writeKey(LEGACY_KEY, undefined).catch(() => undefined);
            toast.success("Ваши машины перенесены в облако");
          }
        }
        const pending = cached?.filter((c) => dirty.current.has(c.id)) ?? [];
        const merged = [...list.filter((c) => !pending.some((p) => p.id === c.id)), ...pending];
        setAll(merged);
        setSync("idle");
      } catch (e) {
        if (e instanceof AuthError) return logout();
        if (!cached) setAll([]);
        setSync("offline");
      } finally {
        if (alive) {
          loaded.current = true;
          setReady(true);
          if (dirty.current.size) schedule();
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [user, cacheKey, logout, schedule]);

  useEffect(() => {
    if (!loaded.current || !cacheKey) return;
    writeKey(cacheKey, all).catch(() => undefined);
    if (dirty.current.size) schedule();
  }, [all, cacheKey, schedule]);

  const updateCar = useCallback<FleetCtx["updateCar"]>((id, patch) => {
    mark(id);
    setAll((p) => p.map((c) => (c.id === id ? { ...c, ...(typeof patch === "function" ? patch(c) : patch) } : c)));
  }, []);

  const addCar = useCallback((car: Car) => {
    mark(car.id);
    setAll((p) => [...p, car]);
  }, []);

  const removeCar = useCallback((id: string) => {
    dirty.current.delete(id);
    setAll((p) => p.filter((c) => c.id !== id));
    garageApi.remove(id).catch(() => toast.error("Не удалось удалить в облаке, попробуйте позже"));
  }, []);

  const archiveCar = useCallback((id: string, value: boolean) => updateCar(id, { archived: value }), [updateCar]);

  const logMileage = useCallback(
    (id: string, km: number) =>
      updateCar(id, (c) => ({ mileage: km, mileageLog: [...c.mileageLog, { date: today(), km }].slice(-200) })),
    [updateCar],
  );

  const stylize = useCallback(
    (car: Car, source?: string) => {
      const image = source ?? car.heroSource ?? car.photos[0];
      if (!image) return toast.error("Сначала добавьте фото машины");
      const attempt = image === car.heroSource ? (car.heroAttempt ?? 0) + 1 : 0;
      setAll((p) => p.map((c) => (c.id === car.id ? { ...c, heroStatus: "pending" } : c)));
      makeStudioPhoto(image, attempt)
        .then((url) => {
          updateCar(car.id, { hero: url, heroSource: image, heroAttempt: attempt, heroStatus: undefined });
          toast.success(`${car.make} — студийное фото готово`);
        })
        .catch((e: Error) => {
          setAll((p) => p.map((c) => (c.id === car.id ? { ...c, heroStatus: "error" } : c)));
          toast.error(e.message);
        });
    },
    [updateCar],
  );

  const importCars = useCallback((list: Car[]) => {
    const ids = new Set(latest.current.map((c) => c.id));
    const updated = list.filter((c) => ids.has(c.id)).length;
    list.forEach((c) => mark(c.id));
    setAll((prev) => {
      const map = new Map(prev.map((c) => [c.id, c]));
      list.forEach((c) => map.set(c.id, { ...c, heroStatus: undefined }));
      return [...map.values()];
    });
    return { added: list.length - updated, updated };
  }, []);

  const cars = useMemo(() => all.filter((c) => !c.archived), [all]);
  const archived = useMemo(() => all.filter((c) => c.archived), [all]);

  return (
    <Ctx.Provider value={{ cars, archived, all, importCars, ready, sync, addCar, updateCar, removeCar, archiveCar, logMileage, stylize }}>
      {children}
    </Ctx.Provider>
  );
};

export const useFleet = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFleet outside FleetProvider");
  return ctx;
};
