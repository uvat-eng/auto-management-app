import Icon from "@/components/ui/icon";
import BackButton from "./BackButton";
import { Car, formatDate, formatKm, formatMoney, formatTerm, serviceLeft, serviceTotal } from "@/lib/fleet";

interface Props {
  car?: Car;
  cars: Car[];
  onSelectCar: (i: number) => void;
  onAdd: () => void;
  onBack: () => void;
  onOpenRecord: (id: string) => void;
}

const ServiceScreen = ({ car, cars, onSelectCar, onAdd, onBack, onOpenRecord }: Props) => {

  if (!car) return <div className="[grid-area:photo/photo/due/due]" />;
  const left = serviceLeft(car);
  const spent = car.services.reduce((s, r) => s + serviceTotal(r), 0);

  return (
    <section className="[grid-area:photo/photo/due/due] min-h-0 overflow-y-auto no-scrollbar animate-fade-in">
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        <BackButton onClick={onBack} />
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-6 px-6">
          {cars.map((c, i) => (
            <button
              key={c.id}
              onClick={() => onSelectCar(i)}
              className={`shrink-0 px-4 h-9 rounded-full text-sm border transition-colors ${c.id === car.id ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {c.plate}
            </button>
          ))}
        </div>

        <div>
          <p className="text-muted-foreground text-sm">{car.make}</p>
          <h2 className="font-head font-semibold text-[44px] sm:text-[56px] tracking-[-0.035em] leading-none text-gold mt-1">
            {left === null ? "—" : left < 0 ? `−${formatKm(-left)} км` : `${formatKm(left)} км`}
          </h2>
          <p className="font-head text-lg mt-2">
            {left !== null && left < 0 ? "ТО просрочено" : "до следующего ТО"}
            {car.nextServiceDate && <span className="text-muted-foreground"> · или через {formatTerm(car.nextServiceDate)}</span>}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            ["Записей", String(car.services.length)],
            ["Потрачено", formatMoney(spent)],
            ["След. ТО", car.nextServiceKm ? `${formatKm(car.nextServiceKm)}` : "—"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-card border border-border p-3">
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{k}</p>
              <p className="font-head text-lg mt-1 truncate">{v}</p>
            </div>
          ))}
        </div>

        <button onClick={onAdd} className="w-full h-12 rounded-full bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
          <Icon name="Plus" size={18} /> Записать ТО
        </button>

        {car.services.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">Записей о ТО пока нет</p>
        ) : (
          <div className="space-y-2">
            {car.services.map((s) => {
              const docs = [s.orderPhoto, s.receiptPhoto, ...(s.photos ?? [])].filter(Boolean) as string[];
              return (
                <button
                  key={s.id}
                  onClick={() => onOpenRecord(s.id)}
                  className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left hover:border-muted-foreground/40 active:scale-[0.99] transition-all"
                >
                  {docs[0] ? (
                    <img src={docs[0]} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                  ) : (
                    <span className="w-14 h-14 rounded-xl bg-background border border-border grid place-items-center shrink-0 text-muted-foreground">
                      <Icon name="Wrench" size={20} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-head text-base truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(s.date)} · {formatKm(s.mileage)} км
                    </p>
                    <p className="text-xs mt-1 flex items-center gap-3">
                      <span className="text-gold">{formatMoney(serviceTotal(s))}</span>
                      {docs.length > 0 && (
                        <span className="text-muted-foreground inline-flex items-center gap-1">
                          <Icon name="Paperclip" size={12} /> {docs.length}
                        </span>
                      )}
                    </p>
                  </div>
                  <Icon name="ChevronRight" size={18} className="text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default ServiceScreen;
