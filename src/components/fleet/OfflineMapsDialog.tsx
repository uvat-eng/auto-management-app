import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import Icon from "@/components/ui/icon";
import { MapLayer, clearTiles, countTiles, downloadArea, planDownload } from "@/lib/maps";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  layer: MapLayer;
  pos: [number, number] | null;
}

const RADII = [5, 15, 40];

const OfflineMapsDialog = ({ open, onOpenChange, layer, pos }: Props) => {
  const [radius, setRadius] = useState(15);
  const [saved, setSaved] = useState(0);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) countTiles().then(setSaved);
  }, [open]);

  const plan = pos ? planDownload(layer, pos[0], pos[1], radius) : [];
  const sizeMb = Math.max(1, Math.round((plan.length * 25) / 1024));

  const start = async () => {
    if (!pos) return toast.error("Не знаем, где вы — включите геопозицию");
    const ctrl = new AbortController();
    abort.current = ctrl;
    setProgress({ done: 0, total: plan.length });
    const r = await downloadArea(layer, plan, (done) => setProgress({ done, total: plan.length }), ctrl.signal);
    setProgress(null);
    setSaved(await countTiles());
    if (ctrl.signal.aborted) return;
    if (r.failed > plan.length / 2) toast.error("Источник карты не ответил — попробуйте другой слой или позже");
    else toast.success(`Карта «${layer.label}» на ${radius} км сохранена`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) abort.current?.abort();
        onOpenChange(v);
      }}
    >
      <DialogContent className="bg-card border-border max-w-[420px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-head text-2xl">Карты без интернета</DialogTitle>
          <DialogDescription>
            Скачаем слой «{layer.label}» вокруг {pos ? "вашего места" : "центра карты"} — он откроется даже без связи.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          {RADII.map((r) => (
            <button
              key={r}
              disabled={!!progress}
              onClick={() => setRadius(r)}
              className={`h-14 rounded-2xl border text-center ${r === radius ? "border-primary text-gold bg-secondary" : "border-border text-muted-foreground"}`}
            >
              <span className="font-head text-lg">{r} км</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Около {sizeMb} МБ · {plan.length} фрагментов. Лучше скачивать по Wi‑Fi.
        </p>

        {progress ? (
          <div className="space-y-2">
            <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {progress.done} из {progress.total}
              </span>
              <button onClick={() => abort.current?.abort()} className="hover:text-destructive">
                Остановить
              </button>
            </div>
          </div>
        ) : (
          <button onClick={start} disabled={!pos} className="w-full h-12 rounded-full bg-primary text-primary-foreground font-medium inline-flex items-center justify-center gap-2 disabled:opacity-40">
            <Icon name="Download" size={18} /> Скачать
          </button>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
          <span>В памяти: {saved} фрагментов</span>
          {saved > 0 && !progress && (
            <button
              onClick={async () => {
                await clearTiles();
                setSaved(0);
                toast.success("Скачанные карты удалены");
              }}
              className="hover:text-destructive"
            >
              Очистить
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OfflineMapsDialog;
