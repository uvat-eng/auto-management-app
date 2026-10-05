import Icon from "@/components/ui/icon";
import BackButton from "./BackButton";
import ManualSheet from "./ManualSheet";
import { useState } from "react";
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
  const [manualOpen, setManualOpen] = useState(false);

  if (!car) return <div className="[grid-area:photo/photo/due/due]" />;
  const left = serviceLeft(car);
  const spent = car.services.reduce((s, r) => s + serviceTotal(r), 0);

  return (
    <section className="[grid-area:photo/photo/due/due] min-h-0 overflow-y-auto no-scrollbar animate-fade-in">
      <div className="max-w-3xl mx-auto px-4 min-[380px]:px-6 py-5 space-y-5">
        <BackButton onClick={onBack} />
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 min-[380px]:-mx-6 min-[380px]:px-6">
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
          <h2 className="font-head font-semibold text-[clamp(34px,11vw,44px)] sm:text-[56px] tracking-[-0.035em] leading-none text-gold mt-1">
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
            <div key={k} className="rounded-2xl bg-card border border-border p-2.5 min-[380px]:p-3 min-w-0">
              <p className="text-[12px] text-muted-foreground truncate">{k}</p>
              <p className="font-head text-base min-[380px]:text-lg mt-0.5 truncate">{v}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={onAdd} className="h-14 rounded-2xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-1.5 px-2 text-[15px] min-[380px]:text-base whitespace-nowrap active:scale-[0.98] transition-transform">
            <Icon name="Plus" size={18} /> Записать ТО
          </button>
          <button
            onClick={() => setManualOpen(true)}
            className="relative h-14 rounded-2xl bg-secondary text-foreground font-medium flex items-center justify-center gap-1.5 px-2 text-[15px] min-[380px]:text-base whitespace-nowrap active:scale-[0.98] transition-transform"
          >
            <Icon name="BookOpen" size={18} className="shrink-0 text-primary" /> Руководство
            {car.manual && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />}
          </button>
        </div>

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
      <ManualSheet car={car} open={manualOpen} onOpenChange={setManualOpen} />
    </section>
  );
};

export default ServiceScreen;
