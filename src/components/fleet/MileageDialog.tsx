import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Car, formatDate, formatKm } from "@/lib/fleet";
import { useFleet } from "@/hooks/use-fleet";
import { toast } from "sonner";

interface Props {
  car?: Car;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const MileageDialog = ({ car, open, onOpenChange }: Props) => {
  const { logMileage } = useFleet();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && car) {
      setValue(String(car.mileage));
      setError("");
    }
  }, [open, car]);

  if (!car) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const km = Number(value.replace(/\s/g, ""));
    if (!Number.isFinite(km) || km <= 0) return setError("Введите пробег числом");
    if (km < car.mileage) return setError(`Пробег не может быть меньше ${formatKm(car.mileage)} км`);
    logMileage(car.id, km);
    toast.success(`Пробег ${formatKm(km)} км записан`);
    onOpenChange(false);
  };

  const history = [...car.mileageLog].reverse().slice(0, 6);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-[420px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-head text-2xl">Пробег сегодня</DialogTitle>
          <DialogDescription>
            {car.make} · {car.plate}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <Input
              autoFocus
              inputMode="numeric"
              value={value}
              onChange={(e) => {
                setValue(e.target.value.replace(/[^\d\s]/g, ""));
                setError("");
              }}
              className="h-16 text-3xl font-head font-semibold pr-14 bg-background rounded-2xl"
            />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground">км</span>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="submit" className="w-full h-12 rounded-full bg-primary text-primary-foreground font-medium active:scale-[0.98] transition-transform">
            Записать
          </button>
        </form>
        {history.length > 0 && (
          <div className="pt-2">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">История</p>
            <ul className="divide-y divide-border">
              {history.map((h, i) => (
                <li key={i} className="flex justify-between py-2 text-sm">
                  <span className="text-muted-foreground">{formatDate(h.date)}</span>
                  <span className="font-head">{formatKm(h.km)} км</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MileageDialog;
