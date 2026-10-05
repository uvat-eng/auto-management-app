import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { AuthError, User, authApi, getToken, setToken } from "@/lib/api";

interface AuthCtx {
  user: User | null;
  checking: boolean;
  login: (login: string, password: string) => Promise<void>;
  register: (login: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);
const USER_KEY = "avtopark-user";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      return getToken() ? JSON.parse(localStorage.getItem(USER_KEY) || "null") : null;
    } catch {
      return null;
    }
  });
  const [checking, setChecking] = useState(Boolean(getToken()) && !user);

  const remember = (u: User | null, token?: string) => {
    if (token !== undefined) setToken(token);
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
    setUser(u);
  };

  useEffect(() => {
    if (!getToken()) return;
    authApi
      .me()
      .then((u) => remember(u))
      .catch((e) => e instanceof AuthError && remember(null, ""))
      .finally(() => setChecking(false));
  }, []);

  const login = useCallback(async (l: string, p: string) => {
    const r = await authApi.login(l, p);
    remember(r.user, r.token);
  }, []);

  const register = useCallback(async (l: string, p: string) => {
    const r = await authApi.register(l, p);
    remember(r.user, r.token);
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    remember(null, "");
  }, []);

  return <Ctx.Provider value={{ user, checking, login, register, logout }}>{children}</Ctx.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
};
