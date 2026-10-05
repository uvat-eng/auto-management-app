import { useRef, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Icon from "@/components/ui/icon";
import PhotoSlot from "./PhotoSlot";
import StudioCover from "./StudioCover";
import BackButton from "./BackButton";
import PhotoViewer from "./PhotoViewer";
import PolicyBlock from "./PolicyBlock";
import { Car, MAX_PHOTOS, compressImage, formatDate, formatKm } from "@/lib/fleet";
import { useFleet } from "@/hooks/use-fleet";
import { toast } from "sonner";

export type CarSheetTab = "photos" | "docs" | "insurance";

interface Props {
  car?: Car;
  open: boolean;
  tab: CarSheetTab;
  onTabChange: (t: CarSheetTab) => void;
  onOpenChange: (v: boolean) => void;
  onOpenRecord?: (id: string) => void;
}


const CarSheet = ({ car, open, tab, onTabChange, onOpenChange, onOpenRecord }: Props) => {
  const { updateCar, removeCar, archiveCar, stylize } = useFleet();
  const fileRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!car) return null;

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const free = MAX_PHOTOS - car.photos.length;
    if (free <= 0) return toast.error(`Максимум ${MAX_PHOTOS} фото`);
    const list = Array.from(files).slice(0, free);
    if (files.length > free) toast.message(`Добавлено только ${free} — лимит ${MAX_PHOTOS} фото`);
    setBusy(true);
    try {
      const data = await Promise.all(list.map((f) => compressImage(f)));
      updateCar(car.id, (c) => ({ photos: [...c.photos, ...data].slice(0, MAX_PHOTOS) }));
      if (!car.hero && !car.photos.length && data[0]) stylize(car, data[0]);
    } catch {
      toast.error("Не удалось загрузить фото");
    } finally {
      setBusy(false);
    }
  };

  const makeCover = (i: number) =>
    updateCar(car.id, (c) => {
      const p = [...c.photos];
      const [x] = p.splice(i, 1);
      return { photos: [x, ...p] };
    });

  const removePhoto = (i: number) => updateCar(car.id, (c) => ({ photos: c.photos.filter((_, j) => j !== i) }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="p-0 h-[calc(100dvh-env(safe-area-inset-top)-12px)] pb-[env(safe-area-inset-bottom)] rounded-t-[32px] bg-card border-border flex flex-col">
        <SheetHeader className="px-6 pt-5 pb-3 text-left space-y-3">
          <BackButton onClick={() => onOpenChange(false)} className="self-start" />
          <SheetTitle className="font-head text-2xl">{car.make}</SheetTitle>
          <SheetDescription>
            {car.plate}
            {car.year ? ` · ${car.year} г.` : ""} · {formatKm(car.mileage)} км
          </SheetDescription>
        </SheetHeader>

        <Tabs value={tab} onValueChange={(v) => onTabChange(v as CarSheetTab)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 bg-background rounded-full p-1 h-11 grid grid-cols-3">
            <TabsTrigger value="photos" className="rounded-full data-[state=active]:bg-secondary">Фото</TabsTrigger>
            <TabsTrigger value="docs" className="rounded-full data-[state=active]:bg-secondary">Документы</TabsTrigger>
            <TabsTrigger value="insurance" className="rounded-full data-[state=active]:bg-secondary">Страховки</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-6 pb-10 pt-4">
            <TabsContent value="photos" className="mt-0">
              <StudioCover car={car} onRedo={() => stylize(car)} onView={setView} />
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">
                  {car.photos.length} из {MAX_PHOTOS}. Первое фото — обложка.
                </p>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {car.photos.length < MAX_PHOTOS && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={busy}
                    className="aspect-square rounded-2xl border border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                  >
                    <Icon name={busy ? "Loader" : "ImagePlus"} size={22} className={busy ? "animate-spin" : ""} />
                    <span className="text-xs">Добавить</span>
                  </button>
                )}
                {car.photos.map((p, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group">
                    <button onClick={() => setView(p)} className="w-full h-full">
                      <img src={p} alt="" className="w-full h-full object-cover" />
                    </button>
                    {i === 0 && <span className="absolute left-1.5 top-1.5 text-[12px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">обложка</span>}
                    <div className="absolute right-1.5 top-1.5 flex gap-1">
                      <button
                        onClick={() => stylize(car, p)}
                        disabled={car.heroStatus === "pending"}
                        aria-label="Сделать студийную обложку"
                        className="w-6 h-6 rounded-full bg-background/80 grid place-items-center hover:text-primary"
                      >
                        <Icon name="Sparkles" size={12} />
                      </button>
                      {i > 0 && (
                        <button onClick={() => makeCover(i)} aria-label="Сделать обложкой" className="w-6 h-6 rounded-full bg-background/80 grid place-items-center">
                          <Icon name="Star" size={12} />
                        </button>
                      )}
                      <button onClick={() => removePhoto(i)} aria-label="Удалить" className="w-6 h-6 rounded-full bg-background/80 grid place-items-center hover:text-destructive">
                        <Icon name="X" size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="docs" className="mt-0 space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">СТС</p>
                <PhotoSlot label="Фото СТС" value={car.sts} onChange={(v) => updateCar(car.id, { sts: v })} onView={setView} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">ПТС</p>
                <PhotoSlot label="Фото ПТС" value={car.pts} onChange={(v) => updateCar(car.id, { pts: v })} onView={setView} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Документы по ТО</p>
                {car.services.some((x) => x.orderPhoto || x.receiptPhoto || x.photos?.length) ? (
                  <div className="space-y-2">
                    {car.services
                      .filter((x) => x.orderPhoto || x.receiptPhoto || x.photos?.length)
                      .map((x) => {
                        const files = [x.orderPhoto, x.receiptPhoto, ...(x.photos ?? [])].filter(Boolean) as string[];
                        return (
                          <button
                            key={x.id}
                            onClick={() => onOpenRecord?.(x.id)}
                            className="w-full flex items-center gap-3 rounded-2xl border border-border bg-background p-3 text-left"
                          >
                            <img src={files[0]} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate">{x.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(x.date)} · файлов: {files.length}
                              </p>
                            </div>
                            <Icon name="ChevronRight" size={18} className="text-muted-foreground" />
                          </button>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Наряд-заказы и чеки появятся здесь, когда вы добавите их в записи о ТО.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Госномер</Label>
                  <Input value={car.plate} onChange={(e) => updateCar(car.id, { plate: e.target.value.toUpperCase() })} className="bg-background" />
                </div>
                <div className="space-y-1.5">
                  <Label>Год</Label>
                  <Input value={car.year ?? ""} inputMode="numeric" onChange={(e) => updateCar(car.id, { year: e.target.value })} className="bg-background" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>VIN</Label>
                <Input value={car.vin ?? ""} onChange={(e) => updateCar(car.id, { vin: e.target.value.toUpperCase() })} className="bg-background font-mono" />
              </div>

              <button
                onClick={() => {
                  archiveCar(car.id, true);
                  onOpenChange(false);
                  toast.success(`${car.make} в архиве`, { description: "Данные сохранены. Вернуть можно в меню профиля." });
                }}
                className="w-full h-11 rounded-full border border-border text-foreground hover:border-muted-foreground transition-colors inline-flex items-center justify-center gap-2"
              >
                <Icon name="Archive" size={16} /> В архив — продал или не езжу
              </button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="w-full h-11 rounded-full text-sm text-muted-foreground hover:text-destructive transition-colors">
                    Удалить автомобиль
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border rounded-3xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Удалить {car.make}?</AlertDialogTitle>
                    <AlertDialogDescription>Фото, история ТО и страховки этой машины будут удалены. Если просто продали машину — лучше уберите её в архив.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-full">Отмена</AlertDialogCancel>
                    <AlertDialogAction
                      className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => {
                        removeCar(car.id);
                        onOpenChange(false);
                        toast.success("Автомобиль удалён");
                      }}
                    >
                      Удалить
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TabsContent>

            <TabsContent value="insurance" className="mt-0 space-y-4">
              <PolicyBlock key={`o-${car.id}`} title="ОСАГО" hint="Обязательная страховка" policy={car.osago} onSave={(p) => updateCar(car.id, { osago: p })} />
              <PolicyBlock key={`k-${car.id}`} title="КАСКО" hint="Добровольная страховка" policy={car.kasko} onSave={(p) => updateCar(car.id, { kasko: p })} />
              <p className="text-xs text-muted-foreground px-1">Напоминание появится за 30 дней до окончания полиса.</p>
            </TabsContent>
          </div>
        </Tabs>
        <PhotoViewer src={view} onClose={() => setView(null)} />
      </SheetContent>
    </Sheet>
  );
};

export default CarSheet;
