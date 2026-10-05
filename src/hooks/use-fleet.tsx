import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Car, SEED_HERO, seedCars, today } from "@/lib/fleet";

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
}

const Ctx = createContext<FleetCtx | null>(null);

export const FleetProvider = ({ children }: { children: ReactNode }) => {
  const [cars, setCars] = useState<Car[]>([]);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    readCars()
      .then((stored) => setCars(stored ? stored.map((c) => (c.hero || !SEED_HERO[c.id] ? c : { ...c, hero: SEED_HERO[c.id] })) : seedCars()))
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

  return (
    <Ctx.Provider value={{ cars, ready, addCar, updateCar, removeCar, logMileage }}>{children}</Ctx.Provider>
  );
};

export const useFleet = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFleet outside FleetProvider");
  return ctx;
};
