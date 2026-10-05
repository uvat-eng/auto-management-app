import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Icon from "@/components/ui/icon";
import PolicyDialog from "./PolicyDialog";
import { useAuth } from "@/hooks/use-auth";

const HERO = "https://cdn.poehali.dev/projects/508cc4dd-a6fa-4f8a-b231-26fde3c72eed/files/3254bc5e-fd7b-4eaf-908d-cdd63b0cc56e.jpg";

const AuthScreen = () => {
  const { login, register, reset } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | "reset">("register");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [consent, setConsent] = useState(false);
  const [policy, setPolicy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isReg = mode === "register";
  const isReset = mode === "reset";
  const switchMode = (m: typeof mode) => {
    setMode(m);
    setError("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (isReg && !consent) return setError("Примите условия, чтобы продолжить");
    setBusy(true);
    try {
      if (isReset) await reset(name.trim(), code, password);
      else await (isReg ? register : login)(name.trim(), password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <div className="relative h-[38dvh] min-h-[220px] overflow-hidden">
        <img src={HERO} alt="" className="absolute inset-0 w-full h-full object-cover [object-position:center_62%]" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-background" />
        <p className="absolute left-6 top-6 text-sm font-medium tracking-[0.02em]">Твой автопарк</p>
      </div>

      <form onSubmit={submit} className="flex-1 w-full max-w-md mx-auto px-6 pb-10 -mt-6 relative space-y-5 animate-fade-in">
        <div>
          <h1 className="font-head font-semibold text-[34px] tracking-[-0.03em] leading-tight">{isReset ? "Новый пароль" : isReg ? "Создайте гараж" : "С возвращением"}</h1>
          <p className="text-muted-foreground mt-1">{isReset
              ? "Введите логин и код восстановления, который получили при регистрации."
              : isReg
                ? "Машины, ТО и документы — в облаке, с любого телефона."
                : "Войдите, чтобы открыть свой автопарк."}</p>
        </div>

        <div className="space-y-1.5">
          <Label>Логин</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="username" autoCapitalize="none" placeholder="ivan_petrov" className="bg-card h-12" />
        </div>
        {isReset && (
          <div className="space-y-1.5">
            <Label>Код восстановления</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoCapitalize="characters" placeholder="XXXX-XXXX-XXXX" className="bg-card h-12 font-mono tracking-[0.1em]" />
          </div>
        )}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>{isReset ? "Новый пароль" : "Пароль"}</Label>
            {mode === "login" && (
              <button type="button" onClick={() => switchMode("reset")} className="text-xs text-muted-foreground hover:text-gold-link">
                Забыли пароль?
              </button>
            )}
          </div>
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isReg || isReset ? "new-password" : "current-password"}
              placeholder={isReg || isReset ? "Не короче 6 символов" : ""}
              className="bg-card h-12 pr-12"
            />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label="Показать пароль" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Icon name={show ? "EyeOff" : "Eye"} size={18} />
            </button>
          </div>
        </div>

        {isReg && (
          <label className="flex items-start gap-3 text-sm text-muted-foreground cursor-pointer">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
            <span>
              Принимаю{" "}
              <button type="button" onClick={() => setPolicy(true)} className="text-gold-link underline underline-offset-2">
                условия и политику обработки данных
              </button>
            </span>
          </label>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button type="submit" disabled={busy} className="w-full h-12 rounded-full bg-primary text-primary-foreground font-medium disabled:opacity-60 active:scale-[0.98] transition-transform inline-flex items-center justify-center gap-2">
          {busy && <Icon name="Loader" size={18} className="animate-spin" />}
          {isReset ? "Сменить пароль и войти" : isReg ? "Зарегистрироваться" : "Войти"}
        </button>

        <button type="button" onClick={() => switchMode(isReg ? "login" : isReset ? "login" : "register")} className="w-full text-sm text-muted-foreground hover:text-foreground">
          {isReset ? "Вспомнили пароль? Войти" : isReg ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться"}
        </button>
      </form>
      <PolicyDialog open={policy} onOpenChange={setPolicy} />
    </div>
  );
};

export default AuthScreen;
