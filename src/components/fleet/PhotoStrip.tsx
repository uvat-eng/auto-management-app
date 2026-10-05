import { useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { Label } from "@/components/ui/label";
import { compressImage } from "@/lib/fleet";
import { toast } from "sonner";

interface Props {
  title: string;
  photos: string[];
  onChange: (p: string[]) => void;
  max?: number;
}

const PhotoStrip = ({ title, photos, onChange, max = 12 }: Props) => {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, max - photos.length);
    setBusy(true);
    try {
      const data = await Promise.all(list.map((f) => compressImage(f, 1600, 0.8)));
      onChange([...photos, ...data]);
    } catch {
      toast.error("Не удалось загрузить фото");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Label className="mb-2 block">
        {title} <span className="text-muted-foreground font-normal">· {photos.length}</span>
      </Label>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {photos.length < max && (
          <button
            type="button"
            onClick={() => ref.current?.click()}
            disabled={busy}
            className="shrink-0 w-20 h-20 rounded-xl border border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary hover:border-primary transition-colors"
          >
            <Icon name={busy ? "Loader" : "ImagePlus"} size={20} className={busy ? "animate-spin" : ""} />
            <span className="text-[10px]">Добавить</span>
          </button>
        )}
        {photos.map((p, i) => (
          <div key={i} className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden">
            <img src={p} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(photos.filter((_, j) => j !== i))}
              aria-label="Удалить"
              className="absolute right-1 top-1 w-6 h-6 rounded-full bg-background/80 grid place-items-center hover:text-destructive"
            >
              <Icon name="X" size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PhotoStrip;
