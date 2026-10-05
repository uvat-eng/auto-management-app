import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import Icon from "@/components/ui/icon";
import BackButton from "./BackButton";
import { Car, formatDate } from "@/lib/fleet";
import { ManualHit, manualsApi } from "@/lib/api";
import { useFleet } from "@/hooks/use-fleet";
import { toast } from "sonner";

interface Props {
  car?: Car;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const openPdf = (url: string) => {
  const bridge = (window as unknown as { AvtoparkNative?: { openUrl?: (u: string) => void } }).AvtoparkNative;
  if (bridge?.openUrl) bridge.openUrl(url);
  else window.open(url, "_blank", "noopener");
};

const ManualSheet = ({ car, open, onOpenChange }: Props) => {
  const { updateCar } = useFleet();
  const [hits, setHits] = useState<ManualHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  const manual = car?.manual;

  const run = async () => {
    if (!car) return;
    setSearching(true);
    setError("");
    setHits(null);
    try {
      setHits(await manualsApi.search(car.make, car.year));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (open && car && !car.manual && !hits && !searching) run();
    if (!open) {
      setHits(null);
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, car?.id]);

  const choose = async (h: ManualHit) => {
    if (!car) return;
    setSaving(h.url);
    try {
      const r = h.pdf ? await manualsApi.save(h.url) : { url: h.url, stored: false };
      updateCar(car.id, {
        manual: { url: r.url, title: h.title, source: h.source, original: h.url, stored: r.stored, size: "size" in r ? r.size : undefined, savedAt: new Date().toISOString() },
      });
      toast.success(r.stored ? "Руководство сохранено в ваш кабинет" : "Ссылка на руководство сохранена");
      setHits(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[calc(100dvh-env(safe-area-inset-top)-12px)] pb-[env(safe-area-inset-bottom)] rounded-t-[32px] bg-card border-border p-0 flex flex-col [&>button]:hidden">
        <SheetHeader className="px-6 pt-5 pb-4 text-left space-y-3 border-b border-border">
          <BackButton onClick={() => onOpenChange(false)} className="self-start" />
          <div>
            <SheetTitle className="font-head text-2xl">Руководство по эксплуатации</SheetTitle>
            <SheetDescription>
              {car?.make}
              {car?.year ? `, ${car.year}` : ""}
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {manual && (
            <div className="rounded-3xl border border-primary/40 bg-background p-5 space-y-4">
              <div className="flex items-start gap-3">
                <span className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground grid place-items-center shrink-0">
                  <Icon name="BookOpen" size={22} />
                </span>
                <div className="min-w-0">
                  <p className="font-medium line-clamp-2">{manual.title || "Руководство"}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {manual.source}
                    {manual.size ? ` · ${(manual.size / 1024 / 1024).toFixed(1)} МБ` : ""} · {formatDate(manual.savedAt.slice(0, 10))}
                  </p>
                  <p className="text-sm mt-1 text-muted-foreground">{manual.stored ? "Хранится в вашем облаке" : "Открывается с сайта источника"}</p>
                </div>
              </div>
              <button onClick={() => openPdf(manual.url)} className="w-full h-12 rounded-full bg-primary text-primary-foreground font-medium inline-flex items-center justify-center gap-2">
                <Icon name="FileText" size={18} /> Открыть PDF
              </button>
              <div className="flex gap-2">
                <button onClick={run} className="flex-1 h-11 rounded-full border border-border text-sm inline-flex items-center justify-center gap-2">
                  <Icon name="Search" size={16} /> Найти другое
                </button>
                <button
                  onClick={() => car && updateCar(car.id, { manual: undefined })}
                  className="h-11 px-4 rounded-full border border-border text-sm text-muted-foreground hover:text-destructive"
                >
                  Удалить
                </button>
              </div>
            </div>
          )}

          {searching && (
            <div className="rounded-3xl border border-border bg-background p-6 flex flex-col items-center text-center gap-3">
              <Icon name="Sparkles" size={28} className="text-primary animate-pulse" />
              <p className="font-medium">Ищем руководство для {car?.make}…</p>
              <p className="text-sm text-muted-foreground">Проверяем официальные сайты и PDF-файлы</p>
            </div>
          )}

          {error && !searching && (
            <div className="rounded-3xl border border-border bg-background p-5 space-y-3">
              <p>{error}</p>
              <button onClick={run} className="h-11 px-5 rounded-full bg-secondary text-sm">
                Повторить поиск
              </button>
            </div>
          )}

          {hits && !searching && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Нашли — выберите подходящее. Лучший вариант первым.</p>
              {hits.map((h, i) => (
                <button
                  key={h.url}
                  onClick={() => choose(h)}
                  disabled={!!saving}
                  className={`w-full flex items-center gap-3 rounded-2xl border bg-background p-4 text-left disabled:opacity-60 transition-colors ${i === 0 ? "border-primary/50" : "border-border"}`}
                >
                  <span className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${h.pdf ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    <Icon name={saving === h.url ? "Loader" : h.pdf ? "FileText" : "Globe"} size={20} className={saving === h.url ? "animate-spin" : ""} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium line-clamp-2">{(h.title || h.source).split(" · ")[0]}</p>
                    {h.title.includes(" · ") && <p className="text-xs text-gold-link truncate">{h.title.split(" · ").pop()}</p>}
                    <p className="text-sm text-muted-foreground truncate">
                      {h.pdf ? "PDF · " : "Страница · "}
                      {h.source}
                    </p>
                  </div>
                  {i === 0 && <span className="text-xs px-2 py-1 rounded-full bg-primary text-primary-foreground shrink-0">Лучшее</span>}
                </button>
              ))}
            </div>
          )}

          {!manual && !searching && !hits && !error && (
            <button onClick={run} className="w-full h-12 rounded-full bg-primary text-primary-foreground font-medium inline-flex items-center justify-center gap-2">
              <Icon name="Sparkles" size={18} /> Найти руководство
            </button>
          )}

          <p className="text-sm text-muted-foreground">
            Подсказка: укажите точную модель и год в карточке машины — так поиск точнее.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ManualSheet;
