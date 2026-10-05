import BackButton from "./BackButton";
import PolicyBlock from "./PolicyBlock";
import { Car } from "@/lib/fleet";
import { useFleet } from "@/hooks/use-fleet";

interface Props {
  car?: Car;
  cars: Car[];
  onSelectCar: (i: number) => void;
  onBack: () => void;
}

const InsuranceScreen = ({ car, cars, onSelectCar, onBack }: Props) => {
  const { updateCar } = useFleet();
  if (!car) return <div className="[grid-area:photo/photo/due/due] grid place-items-center text-muted-foreground">Сначала добавьте машину</div>;

  return (
    <section className="[grid-area:photo/photo/due/due] min-h-0 overflow-y-auto no-scrollbar animate-fade-in">
      <div className="max-w-3xl mx-auto px-5 py-5 space-y-5">
        <BackButton onClick={onBack} />
        {cars.length > 1 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
            {cars.map((c, i) => (
              <button
                key={c.id}
                onClick={() => onSelectCar(i)}
                className={`shrink-0 px-4 h-10 rounded-full text-sm border transition-colors ${c.id === car.id ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground"}`}
              >
                {c.plate}
              </button>
            ))}
          </div>
        )}
        <div>
          <p className="text-muted-foreground">{car.make}</p>
          <h2 className="font-head font-semibold text-[34px] tracking-[-0.03em] leading-tight">Страховки</h2>
        </div>
        <PolicyBlock key={`o-${car.id}`} title="ОСАГО" hint="Обязательная страховка" policy={car.osago} onSave={(p) => updateCar(car.id, { osago: p })} />
        <PolicyBlock key={`k-${car.id}`} title="КАСКО" hint="Добровольная страховка" policy={car.kasko} onSave={(p) => updateCar(car.id, { kasko: p })} />
        <p className="text-sm text-muted-foreground px-1 pb-4">Напомним за 30 дней до окончания полиса.</p>
      </div>
    </section>
  );
};

export default InsuranceScreen;
