import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";
import { APP_VERSION, checkUpdate, getSiteBase, installedVersion, isAndroidApp, openDownload, setSiteBase } from "@/lib/updates";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Result = Awaited<ReturnType<typeof checkUpdate>>;

const UpdateDialog = ({ open, onOpenChange }: Props) => {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState("");
  const [site, setSite] = useState(getSiteBase());
  const app = isAndroidApp();

  const run = async () => {
    setBusy(true);
    setError("");
    try {
      setResult(await checkUpdate());
    } catch (e) {
      setError((e as Error).message || "Нет связи");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (open && (!app || getSiteBase())) run();
    if (!open) setResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const needSite = app && !getSiteBase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-[420px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-head text-2xl">Обновления</DialogTitle>
          <DialogDescription>
            {app ? `Установлена версия ${APP_VERSION.name} (сборка ${installedVersion()})` : "Сайт обновляется сам — вы всегда видите последнюю версию."}
          </DialogDescription>
        </DialogHeader>

        {needSite ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Укажите адрес сайта приложения — один раз, дальше проверка будет автоматической.</p>
            <Input value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://..." className="bg-background h-12" inputMode="url" />
            <button
              onClick={() => {
                if (!/^https:\/\//.test(site.trim())) return setError("Адрес должен начинаться с https://");
                setSiteBase(site.trim());
                run();
              }}
              className="w-full h-12 rounded-full bg-primary text-primary-foreground font-medium"
            >
              Сохранить и проверить
            </button>
          </div>
        ) : busy ? (
          <div className="flex items-center gap-3 py-4 text-muted-foreground">
            <Icon name="Loader" size={20} className="animate-spin" /> Проверяем…
          </div>
        ) : result ? (
          result.available && app ? (
            <div className="space-y-3">
              <div className="rounded-2xl bg-background border border-primary/50 p-4">
                <p className="font-head text-lg text-gold">Доступна версия {result.versionName}</p>
                {result.notes && <p className="text-sm text-muted-foreground mt-1">{result.notes}</p>}
              </div>
              <button onClick={() => openDownload(result.fullUrl)} className="w-full h-12 rounded-full bg-primary text-primary-foreground font-medium inline-flex items-center justify-center gap-2">
                <Icon name="Download" size={18} /> Скачать и установить
              </button>
              <p className="text-xs text-muted-foreground">Файл скачается — откройте его и нажмите «Обновить». Ваши данные сохранятся.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl bg-background border border-border p-4">
                <Icon name="CircleCheck" size={22} className="text-primary shrink-0" />
                <p className="text-sm">{app ? "У вас последняя версия" : `Последняя версия для Android — ${result.versionName}`}</p>
              </div>
              {!app && (
                <button onClick={() => openDownload(result.fullUrl)} className="w-full h-12 rounded-full border border-border inline-flex items-center justify-center gap-2 text-sm">
                  <Icon name="Smartphone" size={18} /> Скачать приложение для Android
                </button>
              )}
            </div>
          )
        ) : null}

        {error && (
          <div className="space-y-2">
            <p className="text-sm text-destructive">{error}</p>
            {!needSite && (
              <button onClick={run} className="text-sm text-gold-link">
                Повторить
              </button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UpdateDialog;
