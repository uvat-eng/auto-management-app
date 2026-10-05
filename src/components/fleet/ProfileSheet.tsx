import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import Icon from "@/components/ui/icon";
import BackButton from "./BackButton";
import PolicyDialog from "./PolicyDialog";
import { useAuth } from "@/hooks/use-auth";
import { useFleet } from "@/hooks/use-fleet";
import { formatKm } from "@/lib/fleet";
import { toast } from "sonner";
import { authApi } from "@/lib/api";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const ProfileSheet = ({ open, onOpenChange }: Props) => {
  const { user, logout, setRecovery } = useAuth();
  const { cars, archived, sync, archiveCar } = useFleet();
  const [policy, setPolicy] = useState(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92dvh] rounded-t-[32px] bg-card border-border p-0 flex flex-col [&>button]:hidden">
        <SheetHeader className="px-6 pt-5 pb-4 text-left space-y-3">
          <BackButton onClick={() => onOpenChange(false)} className="self-start" />
          <div>
            <SheetTitle className="font-head text-2xl">{user?.login}</SheetTitle>
            <SheetDescription className="flex items-center gap-1.5 mt-1">
              <Icon name={sync === "offline" ? "CloudOff" : sync === "saving" ? "RefreshCw" : "Cloud"} size={14} className={sync === "saving" ? "animate-spin" : ""} />
              {sync === "offline" ? "Нет связи — сохраним, когда появится интернет" : sync === "saving" ? "Сохраняем в облако…" : "Всё сохранено в облаке"}
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-10 space-y-6">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-background border border-border p-4">
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">В гараже</p>
              <p className="font-head text-2xl mt-1">{cars.length}</p>
            </div>
            <div className="rounded-2xl bg-background border border-border p-4">
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">В архиве</p>
              <p className="font-head text-2xl mt-1">{archived.length}</p>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Архив</p>
            {archived.length ? (
              <div className="space-y-2">
                {archived.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3">
                    {c.hero || c.photos[0] ? (
                      <img src={c.hero || c.photos[0]} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0 opacity-70" />
                    ) : (
                      <span className="w-14 h-14 rounded-xl bg-muted grid place-items-center shrink-0 text-muted-foreground">
                        <Icon name="Car" size={22} />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{c.make}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.plate} · {formatKm(c.mileage)} км · ТО: {c.services.length}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        archiveCar(c.id, false);
                        toast.success(`${c.make} снова в гараже`);
                      }}
                      className="shrink-0 h-9 px-3 rounded-full bg-secondary text-sm hover:text-gold-link"
                    >
                      Вернуть
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Проданные машины можно убрать в архив из карточки — история ТО и документы сохранятся.</p>
            )}
          </div>

          <div className="space-y-1">
            <button
              onClick={() =>
                authApi
                  .newCode()
                  .then(setRecovery)
                  .catch((e: Error) => toast.error(e.message))
              }
              className="w-full flex items-center justify-between py-3 text-left text-muted-foreground hover:text-foreground"
            >
              Новый код восстановления пароля <Icon name="KeyRound" size={18} />
            </button>
            <button onClick={() => setPolicy(true)} className="w-full flex items-center justify-between py-3 text-left text-muted-foreground hover:text-foreground">
              Условия и данные <Icon name="ChevronRight" size={18} />
            </button>
            <button
              onClick={() => {
                onOpenChange(false);
                logout();
              }}
              className="w-full flex items-center gap-2 py-3 text-left text-muted-foreground hover:text-destructive"
            >
              <Icon name="LogOut" size={18} /> Выйти
            </button>
          </div>
        </div>
        <PolicyDialog open={policy} onOpenChange={setPolicy} />
      </SheetContent>
    </Sheet>
  );
};

export default ProfileSheet;
