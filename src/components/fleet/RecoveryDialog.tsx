import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const RecoveryDialog = () => {
  const { recovery, setRecovery, user } = useAuth();
  const [saved, setSaved] = useState(false);

  const copy = async () => {
    if (!recovery) return;
    try {
      await navigator.clipboard.writeText(`Твой автопарк\nЛогин: ${user?.login}\nКод восстановления: ${recovery}`);
      toast.success("Скопировано — сохраните в заметках");
    } catch {
      toast.message("Перепишите код вручную");
    }
  };

  const close = () => {
    setRecovery(null);
    setSaved(false);
  };

  return (
    <Dialog open={!!recovery && !!user} onOpenChange={(v) => !v && saved && close()}>
      <DialogContent className="bg-card border-border max-w-[420px] rounded-3xl [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="font-head text-2xl">Код восстановления</DialogTitle>
          <DialogDescription>Если забудете пароль — этот код поможет войти. Сохраните его в заметках или сделайте скриншот.</DialogDescription>
        </DialogHeader>
        <button onClick={copy} className="w-full rounded-2xl bg-background border border-border py-5 flex flex-col items-center gap-2 active:scale-[0.99] transition-transform">
          <span className="font-mono text-2xl tracking-[0.15em] text-gold">{recovery}</span>
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Icon name="Copy" size={12} /> нажмите, чтобы скопировать
          </span>
        </button>
        <p className="text-xs text-muted-foreground">Код одноразовый: после восстановления пароля выдадим новый. Новый код можно получить и в профиле.</p>
        <label className="flex items-center gap-3 text-sm cursor-pointer">
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="w-4 h-4 accent-[hsl(var(--primary))]" />
          Я сохранил код
        </label>
        <button onClick={close} disabled={!saved} className="w-full h-12 rounded-full bg-primary text-primary-foreground font-medium disabled:opacity-40">
          Готово
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default RecoveryDialog;
