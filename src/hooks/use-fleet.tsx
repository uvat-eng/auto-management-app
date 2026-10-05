import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Car, SEED_HERO, seedCars, today } from "@/lib/fleet";
import { makeStudioPhoto } from "@/lib/studio";
import { toast } from "sonner";

const DB_NAME = "tvoy-avtopark";
const STORE = "kv";
const KEY = "cars";

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const readCars = async (): Promise<Car[] | null> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve((req.result as Car[]) ?? null);
    req.onerror = () => reject(req.error);
  });
};

const writeCars = async (cars: Car[]) => {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(cars, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

interface FleetCtx {
  cars: Car[];
  ready: boolean;
  addCar: (car: Car) => void;
  updateCar: (id: string, patch: Partial<Car> | ((c: Car) => Partial<Car>)) => void;
  removeCar: (id: string) => void;
  logMileage: (id: string, km: number) => void;
  stylize: (car: Car, source?: string) => void;
}

const Ctx = createContext<FleetCtx | null>(null);

export const FleetProvider = ({ children }: { children: ReactNode }) => {
  const [cars, setCars] = useState<Car[]>([]);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    readCars()
      .then((stored) =>
        setCars(
          stored
            ? stored.map((c) => {
                const next = c.heroStatus === "pending" ? { ...c, heroStatus: "error" as const } : c;
                return next.hero || !SEED_HERO[c.id] ? next : { ...next, hero: SEED_HERO[c.id] };
              })
            : seedCars(),
        ),
      )
      .catch(() => setCars(seedCars()))
      .finally(() => {
        loaded.current = true;
        setReady(true);
      });
  }, []);

  useEffect(() => {
    if (loaded.current) writeCars(cars).catch(() => undefined);
  }, [cars]);

  const addCar = useCallback((car: Car) => setCars((p) => [...p, car]), []);

  const updateCar = useCallback<FleetCtx["updateCar"]>((id, patch) => {
    setCars((p) => p.map((c) => (c.id === id ? { ...c, ...(typeof patch === "function" ? patch(c) : patch) } : c)));
  }, []);

  const removeCar = useCallback((id: string) => setCars((p) => p.filter((c) => c.id !== id)), []);

  const logMileage = useCallback((id: string, km: number) => {
    setCars((p) =>
      p.map((c) =>
        c.id === id
          ? { ...c, mileage: km, mileageLog: [...c.mileageLog, { date: today(), km }].slice(-200) }
          : c,
      ),
    );
  }, []);

  const stylize = useCallback(
    (car: Car, source?: string) => {
      const image = source ?? car.heroSource ?? car.photos[0];
      if (!image) return toast.error("Сначала добавьте фото машины");
      const attempt = image === car.heroSource ? (car.heroAttempt ?? 0) + 1 : 0;
      updateCar(car.id, { heroStatus: "pending", heroSource: image, heroAttempt: attempt });
      makeStudioPhoto(image, attempt)
        .then((url) => {
          updateCar(car.id, { hero: url, heroStatus: undefined });
          toast.success(`${car.make} — студийное фото готово`);
        })
        .catch((e: Error) => {
          updateCar(car.id, { heroStatus: "error" });
          toast.error(e.message);
        });
    },
    [updateCar],
  );

  return (
    <Ctx.Provider value={{ cars, ready, addCar, updateCar, removeCar, logMileage, stylize }}>{children}</Ctx.Provider>
  );
};

export const useFleet = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFleet outside FleetProvider");
  return ctx;
};
