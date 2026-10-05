import Icon from "@/components/ui/icon";
import { Car } from "@/lib/fleet";

interface Props {
  car: Car;
  onRedo: () => void;
  onView: (src: string) => void;
}

const StudioCover = ({ car, onRedo, onView }: Props) => {
  const pending = car.heroStatus === "pending";
  const failed = car.heroStatus === "error";
  const canRun = Boolean(car.heroSource || car.photos[0]);

  return (
    <div className="mb-5 rounded-3xl border border-border bg-background overflow-hidden">
      <div className="relative aspect-[4/3] bg-black">
        {car.hero && <img src={car.hero} alt="Студийная обложка" onClick={() => onView(car.hero!)} className="w-full h-full object-cover cursor-zoom-in" />}
        {!car.hero && !pending && (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm px-8 text-center">
            Добавьте фото — ИИ поставит машину в чёрную студию для главного экрана
          </div>
        )}
        {pending && (
          <div className="absolute inset-0 grid place-items-center bg-black/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 text-gold">
              <Icon name="Sparkles" size={28} className="animate-pulse" />
              <span className="text-sm text-foreground">Ставим машину в студию…</span>
              <span className="text-xs text-muted-foreground">обычно 10–30 секунд</span>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="font-medium">Обложка главного экрана</p>
          <p className="text-xs text-muted-foreground">{failed ? "Не получилось — попробуйте ещё раз или другое фото" : "Значок ✦ на любом фото — сделать обложкой"}</p>
        </div>
        <button
          onClick={onRedo}
          disabled={pending || !canRun}
          className="shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 active:scale-95 transition-transform"
        >
          <Icon name={car.hero ? "RefreshCw" : "Sparkles"} size={16} />
          {car.hero ? "Переделать" : "Создать"}
        </button>
      </div>
    </div>
  );
};

export default StudioCover;
