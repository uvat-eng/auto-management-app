import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import Icon from "@/components/ui/icon";
import { useFleet } from "@/hooks/use-fleet";
import { useAuth } from "@/hooks/use-auth";
import { formatSize, makeBackup, readBackup, shareOrDownload } from "@/lib/backup";
import { formatDate } from "@/lib/fleet";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const BackupDialog = ({ open, onOpenChange }: Props) => {
  const { all, importCars } = useFleet();
  const { user } = useAuth();
  const [busy, setBusy] = useState<null | "make" | "read">(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [file, setFile] = useState<File | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const make = async () => {
    if (!all.length) return toast.message("Пока нечего сохранять — добавьте машину");
    setBusy("make");
    try {
      const f = await makeBackup(all, user?.login, (done, total) => setProgress({ done, total }));
      setFile(f);
    } catch {
      toast.error("Не удалось собрать файл");
    } finally {
      setBusy(null);
    }
  };

  const send = async (mode: "share" | "save") => {
    if (!file) return;
    let r: string;
    try {
      r = await shareOrDownload(file, mode);
    } catch (e) {
      return toast.error((e as Error).message);
    }
    if (r === "saved") toast.success(mode === "share" ? "Отправка недоступна — файл сохранён в «Загрузки»" : "Файл сохранён в «Загрузки»");
    if (r === "shared") toast.success("Файл отправлен");
  };

  const restore = async (f?: File) => {
    if (!f) return;
    setBusy("read");
    try {
      const { cars, createdAt } = await readBackup(f);
      const r = importCars(cars);
      toast.success(`Загружено из копии от ${formatDate(createdAt.slice(0, 10))}`, {
        description: `Новых машин: ${r.added}, обновлено: ${r.updated}. Сохраняем в облако…`,
      });
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setFile(null);
        onOpenChange(v);
      }}
    >
      <DialogContent className="bg-card border-border max-w-[440px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-head text-2xl">Резервная копия</DialogTitle>
          <DialogDescription>Все машины, ТО, страховки, документы и фото — в одном файле. Пригодится при переезде на новый телефон.</DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl bg-background border border-border p-4 space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Сохранить</p>
          {busy === "make" ? (
            <div className="space-y-2">
              <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Собираем фото: {progress.done} из {progress.total}
              </p>
            </div>
          ) : file ? (
            <>
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-secondary grid place-items-center text-gold shrink-0">
                  <Icon name="FileArchive" size={20} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(file.size)} · машин: {all.length}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => send("share")} className="h-11 rounded-full bg-primary text-primary-foreground text-sm font-medium inline-flex items-center justify-center gap-2">
                  <Icon name="Send" size={16} /> Отправить
                </button>
                <button onClick={() => send("save")} className="h-11 rounded-full border border-border text-sm inline-flex items-center justify-center gap-2">
                  <Icon name="Download" size={16} /> В телефон
                </button>
              </div>
              <p className="text-xs text-muted-foreground">«Отправить» — в почту, Telegram, WhatsApp, на Яндекс Диск.</p>
            </>
          ) : (
            <button onClick={make} className="w-full h-11 rounded-full bg-primary text-primary-foreground text-sm font-medium inline-flex items-center justify-center gap-2">
              <Icon name="FileDown" size={16} /> Создать файл
            </button>
          )}
        </div>

        <div className="rounded-2xl bg-background border border-border p-4 space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Загрузить</p>
          <input
            ref={input}
            type="file"
            accept=".avtopark,application/json,application/octet-stream,*/*"
            hidden
            onChange={(e) => {
              restore(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => input.current?.click()}
            disabled={busy === "read"}
            className="w-full h-11 rounded-full border border-border text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Icon name={busy === "read" ? "Loader" : "FileUp"} size={16} className={busy === "read" ? "animate-spin" : ""} /> Выбрать файл копии
          </button>
          <p className="text-xs text-muted-foreground">Машины из файла добавятся к текущим. Если машина уже есть — её данные заменятся данными из копии.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BackupDialog;
