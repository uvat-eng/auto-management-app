import { useRef } from "react";
import Icon from "@/components/ui/icon";
import { compressImage } from "@/lib/fleet";
import { toast } from "sonner";

interface Props {
  label: string;
  value?: string;
  onChange: (v?: string) => void;
  onView?: (src: string) => void;
  className?: string;
}

const PhotoSlot = ({ label, value, onChange, onView, className = "" }: Props) => {
  const ref = useRef<HTMLInputElement>(null);

  const pick = async (f?: File) => {
    if (!f) return;
    try {
      onChange(await compressImage(f, 1600, 0.8));
    } catch {
      toast.error("Не удалось загрузить фото");
    }
  };

  return (
    <div className={`relative aspect-[4/3] rounded-2xl overflow-hidden border border-border bg-muted ${className}`}>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => {
        pick(e.target.files?.[0]);
        e.target.value = "";
      }} />
      {value ? (
        <>
          <button type="button" onClick={() => onView?.(value)} className="w-full h-full">
            <img src={value} alt={label} className="w-full h-full object-cover" />
          </button>
          <span className="absolute left-2 bottom-2 text-[11px] px-2 py-0.5 rounded-full bg-background/80 backdrop-blur">{label}</span>
          <button
            type="button"
            onClick={() => onChange(undefined)}
            aria-label="Удалить"
            className="absolute right-2 top-2 w-7 h-7 rounded-full bg-background/80 grid place-items-center hover:text-destructive"
          >
            <Icon name="X" size={14} />
          </button>
        </>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors">
          <Icon name="Camera" size={22} />
          <span className="text-xs">{label}</span>
        </button>
      )}
    </div>
  );
};

export default PhotoSlot;
