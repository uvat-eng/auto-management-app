import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";

interface Props {
  photos: string[];
  index: number | null;
  title?: string;
  onClose: () => void;
}

const GalleryViewer = ({ photos, index, title, onClose }: Props) => {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (index !== null) {
      setI(index);
      setZoom(false);
    }
  }, [index]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  });

  if (index === null || !photos.length) return null;
  const n = photos.length;
  const go = (d: number) => {
    setZoom(false);
    setI((v) => (v + d + n) % n);
  };

  const toggleZoom = (e: React.MouseEvent) => {
    const el = box.current;
    if (!zoom && el) {
      const r = (e.target as HTMLElement).getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width;
      const fy = (e.clientY - r.top) / r.height;
      setZoom(true);
      requestAnimationFrame(() => {
        el.scrollLeft = el.scrollWidth * fx - el.clientWidth / 2;
        el.scrollTop = el.scrollHeight * fy - el.clientHeight / 2;
      });
    } else setZoom(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-black flex flex-col animate-fade-in" role="dialog" aria-label="Просмотр фото">
      <div className="flex items-center justify-between gap-3 px-4 pt-[calc(env(safe-area-inset-top)+10px)] pb-2 text-white">
        <div className="min-w-0">
          {title && <p className="font-head text-lg truncate">{title}</p>}
          {n > 1 && (
            <p className="text-sm text-white/60">
              {i + 1} из {n}
            </p>
          )}
        </div>
        <button onClick={onClose} aria-label="Закрыть" className="w-11 h-11 rounded-full bg-white/10 grid place-items-center shrink-0">
          <Icon name="X" size={22} />
        </button>
      </div>

      <div
        ref={box}
        className={`relative flex-1 min-h-0 ${zoom ? "overflow-auto" : "overflow-hidden flex items-center justify-center"}`}
        onTouchStart={(e) => {
          if (zoom) return;
          touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          const t = touch.current;
          touch.current = null;
          if (!t || zoom) return;
          const dx = e.changedTouches[0].clientX - t.x;
          const dy = e.changedTouches[0].clientY - t.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
          else if (dy > 90) onClose();
        }}
      >
        <img
          key={i}
          src={photos[i]}
          alt={title ?? "Фото"}
          onClick={toggleZoom}
          className={zoom ? "max-w-none w-[220%] h-auto cursor-zoom-out" : "max-w-full max-h-full object-contain cursor-zoom-in animate-fade-in"}
        />
      </div>

      <div className="flex items-center justify-between gap-3 px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+12px)] text-white">
        {n > 1 ? (
          <button onClick={() => go(-1)} aria-label="Предыдущее" className="w-12 h-12 rounded-full bg-white/10 grid place-items-center">
            <Icon name="ChevronLeft" size={24} />
          </button>
        ) : (
          <span className="w-12" />
        )}
        <p className="text-sm text-white/60 text-center">{zoom ? "Нажмите, чтобы уменьшить" : "Нажмите на фото, чтобы приблизить"}</p>
        {n > 1 ? (
          <button onClick={() => go(1)} aria-label="Следующее" className="w-12 h-12 rounded-full bg-white/10 grid place-items-center">
            <Icon name="ChevronRight" size={24} />
          </button>
        ) : (
          <span className="w-12" />
        )}
      </div>
    </div>,
    document.body,
  );
};

export default GalleryViewer;
