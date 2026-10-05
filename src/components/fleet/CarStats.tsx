import { Car, daysUntil, formatKm, formatTerm, serviceLeft } from "@/lib/fleet";

interface Props {
  car?: Car;
  onMileage: () => void;
  onInsurance: () => void;
  onService: () => void;
}

const termTone = (iso?: string) => {
  const d = daysUntil(iso);
  if (d === null) return "text-muted-foreground";
  if (d < 0) return "text-destructive";
  if (d <= 30) return "text-primary";
  return "text-foreground";
};

const CarStats = ({ car, onMileage, onInsurance, onService }: Props) => {
  if (!car) return null;
  const left = serviceLeft(car);

  return (
    <>
      <section key={`km-${car.id}`} className="[grid-area:km] px-6 md:px-[90px] pt-3 pb-2 md:pb-6 animate-fade-in">
        <h1 className="font-head font-semibold text-[46px] sm:text-[64px] tracking-[-0.035em] leading-[1.05] text-gold whitespace-nowrap">
          {formatKm(car.mileage)} км
        </h1>
        <button onClick={onService} className="font-head text-[1.3rem] sm:text-[1.6em] font-medium mt-1 text-left hover:text-gold-link transition-colors">
          {left === null ? "Срок ТО не задан." : left < 0 ? `ТО просрочено на ${formatKm(-left)} км.` : `ТО через ${formatKm(left)} км.`}
        </button>
      </section>

      <section key={`due-${car.id}`} className="[grid-area:due] px-6 md:px-[90px] pt-1 md:pt-2 pb-4 md:pb-6 flex flex-col items-stretch md:items-end md:items-end justify-end gap-3.5 animate-fade-in [animation-delay:80ms]">
        <button onClick={onInsurance} className="flex gap-9 text-muted-foreground text-left text-base">
          <div>
            <b className={`block font-head text-[1.8rem] sm:text-[2.2em] font-medium tracking-[-0.02em] leading-tight ${termTone(car.osago?.end)}`}>
              {formatTerm(car.osago?.end)}
            </b>
            ОСАГО
          </div>
          <div>
            <b className={`block font-head text-[1.8rem] sm:text-[2.2em] font-medium tracking-[-0.02em] leading-tight ${termTone(car.kasko?.end)}`}>
              {formatTerm(car.kasko?.end)}
            </b>
            КАСКО
          </div>
        </button>
        <div className="flex items-center justify-between gap-6 bg-secondary rounded-[40px] py-[7px] pr-[7px] pl-6 font-medium text-[1.1rem]">
          Пробег сегодня
          <button
            onClick={onMileage}
            className="bg-primary text-primary-foreground rounded-[40px] px-6 h-12 transition-transform active:scale-95 hover:brightness-110"
          >
            Отметить
          </button>
        </div>
      </section>
    </>
  );
};

export default CarStats;
