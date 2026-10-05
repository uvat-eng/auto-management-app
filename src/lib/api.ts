import { Car } from "@/lib/fleet";

const AUTH_URL = "https://functions.poehali.dev/5035c2fd-8d65-4bb3-9eb9-f8fae129bc0c";
const GARAGE_URL = "https://functions.poehali.dev/1a179f21-2bcf-460d-a896-c1b8210019a7";
const MANUALS_URL = "https://functions.poehali.dev/4a8e5cdd-6f60-45bf-ac5d-ee0b7cb70acf";
const TOKEN_KEY = "avtopark-token";

export interface User {
  id: number;
  login: string;
}

export class AuthError extends Error {}

export const getToken = () => localStorage.getItem(TOKEN_KEY) ?? "";
export const setToken = (t: string) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

const call = async <T>(url: string, method: string, body?: unknown): Promise<T> => {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", "X-Auth-Token": getToken() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new AuthError(data.error || "Нужно войти");
  if (!res.ok) throw new Error(data.error || "Нет связи с сервером");
  return data as T;
};

export const authApi = {
  me: () => call<{ user: User }>(AUTH_URL, "GET").then((r) => r.user),
  login: (login: string, password: string) => call<{ token: string; user: User }>(AUTH_URL, "POST", { action: "login", login, password }),
  register: (login: string, password: string) =>
    call<{ token: string; user: User; recovery: string }>(AUTH_URL, "POST", { action: "register", login, password, consent: true }),
  reset: (login: string, code: string, password: string) =>
    call<{ token: string; user: User; recovery: string }>(AUTH_URL, "POST", { action: "reset", login, code, password }),
  newCode: () => call<{ recovery: string }>(AUTH_URL, "POST", { action: "new_code" }).then((r) => r.recovery),
  logout: () => call(AUTH_URL, "POST", { action: "logout" }).catch(() => undefined),
};

export const garageApi = {
  list: () => call<{ cars: Car[] }>(GARAGE_URL, "GET").then((r) => r.cars),
  save: (car: Car) => call(GARAGE_URL, "PUT", { car }),
  remove: (id: string) => call(GARAGE_URL, "DELETE", { id }),
  upload: (image: string) => call<{ url: string }>(GARAGE_URL, "POST", { action: "upload", image }).then((r) => r.url),
};

export interface ManualHit {
  url: string;
  title: string;
  source: string;
  pdf: boolean;
}

export const manualsApi = {
  search: async (make: string, year?: string) => {
    for (let i = 0; ; i++) {
      try {
        const r = (await call<{ results: ManualHit[] }>(MANUALS_URL, "POST", { action: "search", make, year })).results;
        if (r.length || i >= 2) return r;
      } catch (e) {
        if (i >= 2 || e instanceof AuthError) throw e;
      }
    }
  },
  save: (url: string) => call<{ url: string; stored: boolean; size?: number }>(MANUALS_URL, "POST", { action: "save", url }),
};
