import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Icon from "@/components/ui/icon";
import PhotoViewer from "./PhotoViewer";
import { Car, formatDate, formatKm, formatMoney, formatTerm, serviceLeft, serviceTotal } from "@/lib/fleet";
import { useFleet } from "@/hooks/use-fleet";

interface Props {
  car?: Car;
  cars: Car[];
  onSelectCar: (i: number) => void;
  onAdd: () => void;
}

const ServiceScreen = ({ car, cars, onSelectCar, onAdd }: Props) => {
  const { updateCar } = useFleet();
  const [view, setView] = useState<string | null>(null);

  if (!car) return <div className="[grid-area:photo/photo/due/due]" />;
  const left = serviceLeft(car);
  const spent = car.services.reduce((s, r) => s + serviceTotal(r), 0);

  return (
    <section className="[grid-area:photo/photo/due/due] min-h-0 overflow-y-auto no-scrollbar animate-fade-in">
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
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
          <Accordion type="single" collapsible className="space-y-2">
            {car.services.map((s) => (
              <AccordionItem key={s.id} value={s.id} className="rounded-2xl border border-border bg-card px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="text-left">
                    <p className="font-head text-base">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(s.date)} · {formatKm(s.mileage)} км · {formatMoney(serviceTotal(s))}
                    </p>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  {[
                    ["Работы", s.works],
                    ["Запчасти", s.parts],
                  ].map(([label, items]) =>
                    (items as typeof s.works).length ? (
                      <div key={label as string}>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">{label as string}</p>
                        <ul className="divide-y divide-border">
                          {(items as typeof s.works).map((it, i) => (
                            <li key={i} className="flex justify-between py-1.5 text-sm gap-3">
                              <span>{it.name}</span>
                              <span className="text-muted-foreground whitespace-nowrap">{formatMoney(it.cost)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null,
                  )}
                  {(s.orderPhoto || s.receiptPhoto) && (
                    <div className="flex gap-2">
                      {[
                        ["Наряд-заказ", s.orderPhoto],
                        ["Чек", s.receiptPhoto],
                      ].map(([l, src]) =>
                        src ? (
                          <button key={l} onClick={() => setView(src)} className="relative w-24 h-20 rounded-xl overflow-hidden border border-border">
                            <img src={src} alt={l} className="w-full h-full object-cover" />
                            <span className="absolute inset-x-0 bottom-0 text-[10px] bg-background/80 py-0.5">{l}</span>
                          </button>
                        ) : null,
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => updateCar(car.id, (c) => ({ services: c.services.filter((x) => x.id !== s.id) }))}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Удалить запись
                  </button>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
      <PhotoViewer src={view} onClose={() => setView(null)} />
    </section>
  );
};

export default ServiceScreen;
