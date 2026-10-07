import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDeleted: () => void;
}

const DeleteAccountDialog = ({ open, onOpenChange, onDeleted }: Props) => {
  const { user, logout } = useAuth();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await authApi.deleteAccount(password);
      if (user) indexedDB.open("tvoy-avtopark").onsuccess = (ev) => {
        const db = (ev.target as IDBOpenDBRequest).result;
        try {
          db.transaction("kv", "readwrite").objectStore("kv").delete(`cars-${user.id}`);
        } catch {
          /* no cache */
        }
      };
      onDeleted();
      logout();
      toast.success("Аккаунт и все данные удалены");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setPassword("");
          setError("");
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="bg-card border-border max-w-[440px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-head text-2xl">Удалить аккаунт?</DialogTitle>
          <DialogDescription>
            Аккаунт «{user?.login}», все машины, фото, история ТО и страховки будут удалены безвозвратно. Чтобы подтвердить, введите пароль.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Input type="password" autoComplete="current-password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-background" />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onOpenChange(false)} className="h-11 rounded-full border border-border">
              Отмена
            </button>
            <button type="submit" disabled={busy || !password} className="h-11 rounded-full bg-destructive text-destructive-foreground font-medium disabled:opacity-50">
              {busy ? "Удаляем…" : "Удалить навсегда"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteAccountDialog;
