import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Icon from "@/components/ui/icon";
import PhotoSlot from "./PhotoSlot";
import { Car, LineItem, ServiceRecord, formatMoney, today, uid } from "@/lib/fleet";
import { useFleet } from "@/hooks/use-fleet";
import { toast } from "sonner";

interface Props {
  car?: Car;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const ItemList = ({ title, items, onChange }: { title: string; items: LineItem[]; onChange: (i: LineItem[]) => void }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <Label>{title}</Label>
      <button type="button" onClick={() => onChange([...items, { name: "", cost: 0 }])} className="text-sm text-gold-link flex items-center gap-1">
        <Icon name="Plus" size={14} /> строка
      </button>
    </div>
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <Input
            placeholder="Наименование"
            value={it.name}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            className="bg-background flex-1"
          />
          <Input
            placeholder="₽"
            inputMode="numeric"
            value={it.cost || ""}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, cost: Number(e.target.value.replace(/\D/g, "")) } : x)))}
            className="bg-background w-24"
          />
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive px-1" aria-label="Удалить строку">
            <Icon name="X" size={16} />
          </button>
        </div>
      ))}
    </div>
  </div>
);

const ServiceForm = ({ car, open, onOpenChange }: Props) => {
  const { updateCar } = useFleet();
  const [date, setDate] = useState(today());
  const [mileage, setMileage] = useState("");
  const [title, setTitle] = useState("");
  const [works, setWorks] = useState<LineItem[]>([{ name: "", cost: 0 }]);
  const [parts, setParts] = useState<LineItem[]>([{ name: "", cost: 0 }]);
  const [order, setOrder] = useState<string>();
  const [receipt, setReceipt] = useState<string>();
  const [nextKm, setNextKm] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && car) {
      setDate(today());
      setMileage(String(car.mileage));
      setTitle("");
      setWorks([{ name: "", cost: 0 }]);
      setParts([{ name: "", cost: 0 }]);
      setOrder(undefined);
      setReceipt(undefined);
      setNextKm(String(car.mileage + 10000));
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      setNextDate(d.toISOString().slice(0, 10));
      setError("");
    }
  }, [open, car]);

  if (!car) return null;

  const clean = (l: LineItem[]) => l.filter((x) => x.name.trim());
  const total = [...clean(works), ...clean(parts)].reduce((s, x) => s + (x.cost || 0), 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const km = Number(mileage);
    if (!title.trim()) return setError("Укажите вид работ");
    if (!km) return setError("Укажите пробег на момент ТО");
    const rec: ServiceRecord = {
      id: uid(),
      date,
      mileage: km,
      title: title.trim(),
      works: clean(works),
      parts: clean(parts),
      orderPhoto: order,
      receiptPhoto: receipt,
    };
    updateCar(car.id, (c) => ({
      services: [rec, ...c.services].sort((a, b) => b.date.localeCompare(a.date)),
      mileage: Math.max(c.mileage, km),
      nextServiceKm: nextKm ? Number(nextKm) : undefined,
      nextServiceDate: nextDate || undefined,
    }));
    toast.success("ТО записано");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-[520px] max-h-[92dvh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-head text-2xl">Новое ТО</DialogTitle>
          <DialogDescription>
            {car.make} · {car.plate}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-1.5">
            <Label>Вид работ</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: плановое ТО, замена масла" className="bg-background" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Дата</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label>Пробег, км</Label>
              <Input inputMode="numeric" value={mileage} onChange={(e) => setMileage(e.target.value.replace(/\D/g, ""))} className="bg-background" />
            </div>
          </div>

          <ItemList title="Работы" items={works} onChange={setWorks} />
          <ItemList title="Запчасти" items={parts} onChange={setParts} />

          <div className="flex justify-between items-baseline border-t border-border pt-3">
            <span className="text-muted-foreground text-sm">Итого</span>
            <span className="font-head text-2xl text-gold font-semibold">{formatMoney(total)}</span>
          </div>

          <div>
            <Label className="mb-2 block">Документы с СТО</Label>
            <div className="grid grid-cols-2 gap-3">
              <PhotoSlot label="Наряд-заказ" value={order} onChange={setOrder} />
              <PhotoSlot label="Чек" value={receipt} onChange={setReceipt} />
            </div>
          </div>

          <div className="rounded-2xl bg-background border border-border p-4 space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Следующее ТО</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>На пробеге, км</Label>
                <Input inputMode="numeric" value={nextKm} onChange={(e) => setNextKm(e.target.value.replace(/\D/g, ""))} className="bg-card" />
              </div>
              <div className="space-y-1.5">
                <Label>Не позднее</Label>
                <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="bg-card" />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="submit" className="w-full h-12 rounded-full bg-primary text-primary-foreground font-medium active:scale-[0.98] transition-transform">
            Сохранить ТО
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceForm;
