import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import BackButton from "./BackButton";
import PhotoViewer from "./PhotoViewer";
import { Car, LineItem, ServiceRecord, formatDate, formatKm, formatMoney, serviceTotal } from "@/lib/fleet";

interface Props {
  car?: Car;
  record?: ServiceRecord;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const Items = ({ title, items }: { title: string; items: LineItem[] }) => {
  if (!items.length) return null;
  const sum = items.reduce((s, x) => s + (x.cost || 0), 0);
  return (
    <div className="rounded-3xl border border-border bg-background p-5">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{formatMoney(sum)}</p>
      </div>
      <ul className="divide-y divide-border">
        {items.map((it, i) => (
          <li key={i} className="flex justify-between gap-4 py-2.5">
            <span>{it.name}</span>
            <span className="text-muted-foreground whitespace-nowrap">{formatMoney(it.cost)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const ServiceDetail = ({ car, record, onClose, onEdit, onDelete }: Props) => {
  const [view, setView] = useState<string | null>(null);
  const docs = record
    ? ([
        ["Наряд-заказ", record.orderPhoto],
        ["Чек", record.receiptPhoto],
      ].filter(([, src]) => src) as [string, string][])
    : [];
  const photos = record?.photos ?? [];

  return (
    <Sheet open={!!record} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="p-0 h-[100dvh] sm:h-[92dvh] pt-[calc(env(safe-area-inset-top)+8px)] pb-[env(safe-area-inset-bottom)] sm:rounded-t-[32px] bg-card border-border flex flex-col [&>button]:hidden">
        {record && car && (
          <>
            <SheetHeader className="px-6 pt-5 pb-4 text-left space-y-3 border-b border-border">
              <div className="flex items-center justify-between">
                <BackButton onClick={onClose} />
                <button onClick={onEdit} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-border text-sm hover:text-gold-link">
                  <Icon name="Pencil" size={15} /> Изменить
                </button>
              </div>
              <div>
                <SheetTitle className="font-head text-2xl leading-tight">{record.title}</SheetTitle>
                <SheetDescription className="mt-1">
                  {car.make} · {car.plate}
                </SheetDescription>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["Дата", formatDate(record.date)],
                  ["Пробег", `${formatKm(record.mileage)} км`],
                  ["Итого", formatMoney(serviceTotal(record))],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-2xl bg-background border border-border p-3">
                    <p className="text-[12.5px] uppercase tracking-[0.15em] text-muted-foreground">{k}</p>
                    <p className={`font-head text-sm sm:text-base mt-1 ${k === "Итого" ? "text-gold" : ""}`}>{v}</p>
                  </div>
                ))}
              </div>

              {record.note && (
                <div className="rounded-3xl border border-border bg-background p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Описание</p>
                  <p className="whitespace-pre-wrap leading-relaxed">{record.note}</p>
                </div>
              )}

              <Items title="Работы" items={record.works} />
              <Items title="Запчасти" items={record.parts} />

              <div className="rounded-3xl border border-border bg-background p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Документы с СТО</p>
                {docs.length ? (
                  <div className="grid grid-cols-2 gap-2">
                    {docs.map(([label, src]) => (
                      <button key={label} onClick={() => setView(src)} className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-border">
                        <img src={src} alt={label} className="w-full h-full object-cover" />
                        <span className="absolute left-2 bottom-2 text-[12.5px] px-2 py-0.5 rounded-full bg-background/80 backdrop-blur">{label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <button onClick={onEdit} className="text-sm text-muted-foreground hover:text-gold-link">
                    Нет фото наряд-заказа и чека — добавить
                  </button>
                )}
              </div>

              {photos.length > 0 && (
                <div className="rounded-3xl border border-border bg-background p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Фото · {photos.length}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((p, i) => (
                      <button key={i} onClick={() => setView(p)} className="aspect-square rounded-xl overflow-hidden">
                        <img src={p} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="w-full h-11 rounded-full text-sm text-muted-foreground hover:text-destructive transition-colors">Удалить запись</button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border rounded-3xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Удалить запись о ТО?</AlertDialogTitle>
                    <AlertDialogDescription>Описание, документы и фото этой записи будут удалены.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-full">Отмена</AlertDialogCancel>
                    <AlertDialogAction className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onDelete}>
                      Удалить
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}
        <PhotoViewer src={view} onClose={() => setView(null)} />
      </SheetContent>
    </Sheet>
  );
};

export default ServiceDetail;
