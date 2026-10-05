import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { Reminder } from "@/lib/fleet";
import BackButton from "./BackButton";
import { toast } from "sonner";

interface Props {
  reminders: Reminder[];
  onOpen: (r: Reminder) => void;
  onBack: () => void;
}

const ICONS: Record<Reminder["kind"], string> = {
  "service-km": "Gauge",
  "service-date": "Wrench",
  osago: "ShieldCheck",
  kasko: "Shield",
};

const NOTIFY_KEY = "avtopark-notify";

const RemindersScreen = ({ reminders, onOpen, onBack }: Props) => {
  const [notify, setNotify] = useState(() => localStorage.getItem(NOTIFY_KEY) === "1");

  useEffect(() => {
    localStorage.setItem(NOTIFY_KEY, notify ? "1" : "0");
  }, [notify]);

  const toggle = async (v: boolean) => {
    if (!v) return setNotify(false);
    if (typeof Notification === "undefined") {
      toast.message("Уведомления включатся в установленном приложении");
      return setNotify(true);
    }
    const res = await Notification.requestPermission();
    if (res === "granted") {
      setNotify(true);
      toast.success("Уведомления включены");
    } else toast.error("Разрешите уведомления в настройках телефона");
  };

  const urgent = reminders.filter((r) => r.urgent);
  const later = reminders.filter((r) => !r.urgent);

  const Row = ({ r }: { r: Reminder }) => (
    <button
      onClick={() => onOpen(r)}
      className={`w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition-colors hover:bg-secondary ${r.overdue ? "border-destructive/60" : r.urgent ? "border-primary/50" : "border-border"} bg-card`}
    >
      <span className={`w-11 h-11 rounded-full grid place-items-center shrink-0 ${r.overdue ? "bg-destructive text-destructive-foreground" : r.urgent ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
        <Icon name={ICONS[r.kind]} size={20} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-head text-base">{r.title}</span>
        <span className="block text-sm text-muted-foreground truncate">{r.carName}</span>
      </span>
      <span className={`text-sm text-right max-w-[45%] ${r.overdue ? "text-destructive" : r.urgent ? "text-primary" : "text-muted-foreground"}`}>{r.value}</span>
    </button>
  );

  return (
    <section className="[grid-area:photo/photo/due/due] min-h-0 overflow-y-auto no-scrollbar animate-fade-in">
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        <BackButton onClick={onBack} />
        <div>
          <h2 className="font-head font-semibold text-[44px] sm:text-[56px] tracking-[-0.035em] leading-none text-gold">
            {urgent.length ? `${urgent.length} срочн.` : "Всё в порядке"}
          </h2>
          <p className="font-head text-lg mt-2 text-muted-foreground">ТО и страховки по всему автопарку</p>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-card border border-border p-4">
          <div>
            <p className="font-medium">Напоминать</p>
            <p className="text-sm text-muted-foreground">за 30 дней до срока и за 1 500 км до ТО</p>
          </div>
          <Switch checked={notify} onCheckedChange={toggle} />
        </div>

        {urgent.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Скоро</p>
            {urgent.map((r) => (
              <Row key={r.id} r={r} />
            ))}
          </div>
        )}
        {later.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Позже</p>
            {later.map((r) => (
              <Row key={r.id} r={r} />
            ))}
          </div>
        )}
        {reminders.length === 0 && <p className="text-center text-muted-foreground py-10">Добавьте сроки ТО и страховок — напоминания появятся здесь</p>}
      </div>
    </section>
  );
};

export default RemindersScreen;
