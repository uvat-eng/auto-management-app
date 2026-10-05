import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Icon from "@/components/ui/icon";
import GalleryViewer from "./GalleryViewer";
import { Policy, compressImage, daysUntil, formatDate, formatTerm } from "@/lib/fleet";
import { toast } from "sonner";

interface Props {
  title: string;
  hint: string;
  policy?: Policy;
  onSave: (p?: Policy) => void;
}

const EMPTY: Policy = { company: "", number: "", end: "" };
const MAX = 8;

const PolicyBlock = ({ title, hint, policy, onSave }: Props) => {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<Policy>(policy ?? EMPTY);
  const [view, setView] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const d = daysUntil(policy?.end);
  const photos = policy?.photos ?? [];
  const tone = d === null ? "text-muted-foreground" : d < 0 ? "text-destructive" : d <= 30 ? "text-primary" : "text-foreground";
  const status = d === null ? "Полис не добавлен" : d < 0 ? "Полис истёк" : d <= 30 ? "Скоро заканчивается" : "Действует";

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, MAX - photos.length);
    setBusy(true);
    try {
      const data = await Promise.all(list.map((f) => compressImage(f, 2000, 0.85)));
      onSave({ ...(policy ?? EMPTY), photos: [...photos, ...data] });
      toast.success(data.length > 1 ? "Фото полиса добавлены" : "Фото полиса добавлено");
    } catch {
      toast.error("Не удалось загрузить фото");
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!form.end) return toast.error("Укажите, до какого числа действует полис");
    onSave({ ...form, photos });
    setEdit(false);
    toast.success(`${title} сохранено`);
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-head text-2xl font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
        <button
          onClick={() => {
            setForm(policy ?? EMPTY);
            setEdit((v) => !v);
          }}
          className="h-10 px-4 rounded-full bg-secondary text-sm shrink-0 inline-flex items-center gap-1.5"
        >
          <Icon name={edit ? "X" : policy ? "Pencil" : "Plus"} size={15} />
          {edit ? "Отмена" : policy ? "Изменить" : "Добавить"}
        </button>
      </div>

      {!edit && (
        <div className="rounded-2xl bg-background border border-border p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className={`font-head text-[34px] font-semibold leading-none ${tone}`}>{policy?.end ? formatTerm(policy.end) : "—"}</p>
            <span className={`text-sm ${tone}`}>{status}</span>
          </div>
          {policy?.end && (
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-base">
              <dt className="text-muted-foreground">Действует до</dt>
              <dd>{formatDate(policy.end)}</dd>
              {policy.company && (
                <>
                  <dt className="text-muted-foreground">Страховая</dt>
                  <dd>{policy.company}</dd>
                </>
              )}
              {policy.number && (
                <>
                  <dt className="text-muted-foreground">Номер</dt>
                  <dd className="font-mono break-all">{policy.number}</dd>
                </>
              )}
            </dl>
          )}
        </div>
      )}

      {edit && (
        <div className="space-y-3 animate-fade-in">
          <div className="space-y-1.5">
            <Label>Действует до</Label>
            <Input type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className="bg-background h-12" />
          </div>
          <div className="space-y-1.5">
            <Label>Страховая компания</Label>
            <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Например, Ингосстрах" className="bg-background h-12" />
          </div>
          <div className="space-y-1.5">
            <Label>Номер полиса</Label>
            <Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value.toUpperCase() })} placeholder="ХХХ 0123456789" className="bg-background h-12 font-mono" />
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="flex-1 h-12 rounded-full bg-primary text-primary-foreground font-medium">
              Сохранить
            </button>
            {policy && (
              <button
                onClick={() => {
                  onSave(undefined);
                  setEdit(false);
                  toast.success(`${title} удалено`);
                }}
                className="h-12 px-5 rounded-full border border-border text-muted-foreground hover:text-destructive"
              >
                Удалить
              </button>
            )}
          </div>
        </div>
      )}

      <div>
        <p className="text-sm text-muted-foreground mb-2">Фото полиса · {photos.length}</p>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addPhotos(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p, i) => (
            <div key={i} className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-border">
              <button onClick={() => setView(i)} className="w-full h-full" aria-label="Открыть фото">
                <img src={p} alt={`${title}, фото ${i + 1}`} className="w-full h-full object-cover" />
              </button>
              <button
                onClick={() => onSave({ ...(policy ?? EMPTY), photos: photos.filter((_, j) => j !== i) })}
                aria-label="Удалить фото"
                className="absolute right-1.5 top-1.5 w-8 h-8 rounded-full bg-background/85 grid place-items-center hover:text-destructive"
              >
                <Icon name="X" size={15} />
              </button>
            </div>
          ))}
          {photos.length < MAX && (
            <button
              onClick={() => input.current?.click()}
              disabled={busy}
              className="aspect-[3/4] rounded-2xl border border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary hover:border-primary transition-colors"
            >
              <Icon name={busy ? "Loader" : "Camera"} size={24} className={busy ? "animate-spin" : ""} />
              <span className="text-sm text-center px-2">{photos.length ? "Ещё фото" : "Сфотографировать полис"}</span>
            </button>
          )}
        </div>
      </div>

      <GalleryViewer photos={photos} index={view} title={title} onClose={() => setView(null)} />
    </div>
  );
};

export default PolicyBlock;
