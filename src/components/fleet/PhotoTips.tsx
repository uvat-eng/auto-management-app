import { useState } from "react";
import Icon from "@/components/ui/icon";

const TIPS = ["Машина целиком, сбоку или вполоборота", "Рядом нет других машин и людей", "Днём, без резких теней и бликов", "С 3–5 шагов, телефон на уровне фар"];

const PhotoTips = ({ className = "" }: { className?: string }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors"
      >
        <Icon name="Info" size={12} />
        Как снять для обложки
        <Icon name="ChevronDown" size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground animate-fade-in">
          {TIPS.map((t) => (
            <li key={t} className="flex gap-2">
              <span className="text-muted-foreground/50">—</span>
              {t}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PhotoTips;
