import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Icon from "@/components/ui/icon";
import { Car, compressImage, today, uid } from "@/lib/fleet";
import { useFleet } from "@/hooks/use-fleet";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdded: (index: number) => void;
}

const AddCarDialog = ({ open, onOpenChange, onAdded }: Props) => {
  const { cars, addCar } = useFleet();
  const fileRef = useRef<HTMLInputElement>(null);
  const [make, setMake] = useState("");
  const [plate, setPlate] = useState("");
  const [year, setYear] = useState("");
  const [mileage, setMileage] = useState("");
  const [photo, setPhoto] = useState<string>();
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setMake("");
      setPlate("");
      setYear("");
      setMileage("");
      setPhoto(undefined);
      setErrors({});
    }
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!make.trim()) err.make = "Укажите марку и модель";
    if (!plate.trim()) err.plate = "Укажите госномер";
    if (!Number(mileage)) err.mileage = "Укажите текущий пробег";
    setErrors(err);
    if (Object.keys(err).length) return;
    const km = Number(mileage);
    const car: Car = {
      id: uid(),
      make: make.trim(),
      plate: plate.trim().toUpperCase(),
      year: year || undefined,
      photos: photo ? [photo] : [],
      mileage: km,
      mileageLog: [{ date: today(), km }],
      services: [],
      nextServiceKm: km + 10000,
    };
    addCar(car);
    toast.success(`${car.make} в автопарке`);
    onOpenChange(false);
    onAdded(cars.length);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-[440px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-head text-2xl">Новая машина</DialogTitle>
          <DialogDescription>Остальное — фото, документы и страховки — добавите в карточке.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setPhoto(await compressImage(f));
            }}
          />
          <button type="button" onClick={() => fileRef.current?.click()} className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden border border-dashed border-border bg-background grid place-items-center text-muted-foreground hover:text-primary transition-colors">
            {photo ? (
              <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-2">
                <Icon name="Camera" size={26} />
                <span className="text-sm">Главное фото</span>
              </span>
            )}
          </button>
          <div className="space-y-1.5">
            <Label>Марка и модель</Label>
            <Input value={make} onChange={(e) => setMake(e.target.value)} placeholder="Mercedes-Benz S 500" className="bg-background" />
            {errors.make && <p className="text-xs text-destructive">{errors.make}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Госномер</Label>
              <Input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="А 777 АА" className="bg-background" />
              {errors.plate && <p className="text-xs text-destructive">{errors.plate}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Год</Label>
              <Input value={year} inputMode="numeric" maxLength={4} onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))} placeholder="2019" className="bg-background" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Пробег, км</Label>
            <Input value={mileage} inputMode="numeric" onChange={(e) => setMileage(e.target.value.replace(/\D/g, ""))} placeholder="184250" className="bg-background" />
            {errors.mileage && <p className="text-xs text-destructive">{errors.mileage}</p>}
          </div>
          <button type="submit" className="w-full h-12 rounded-full bg-primary text-primary-foreground font-medium active:scale-[0.98] transition-transform">
            Добавить в автопарк
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCarDialog;
