import Icon from "@/components/ui/icon";

export type HeadLink = "cars" | "service" | "insurance" | "docs";

interface Props {
  active: HeadLink;
  onNavigate: (to: HeadLink) => void;
  onAddCar: () => void;
  onProfile: () => void;
  onReminders: () => void;
  alerts: number;
}

const LINKS: { id: HeadLink; label: string }[] = [
  { id: "cars", label: "Машины" },
  { id: "service", label: "ТО" },
  { id: "insurance", label: "Страховки" },
  { id: "docs", label: "Документы" },
];

const AppHeader = ({ active, onNavigate, onAddCar, onProfile, onReminders, alerts }: Props) => (
  <header className="[grid-area:head] safe-top relative z-10 bg-background">
    <div className="h-14 flex items-center justify-between gap-4 px-5 md:px-[90px] text-base">
    <b className="font-head font-semibold text-lg tracking-[0.01em] text-foreground whitespace-nowrap">Твой автопарк</b>
    <div className="hidden">
      {LINKS.map((l) => (
        <button
          key={l.id}
          onClick={() => onNavigate(l.id)}
          className={`transition-opacity hover:opacity-100 ${active === l.id ? "opacity-100 text-gold-link" : "opacity-80"}`}
        >
          {l.label}
        </button>
      ))}
    </div>
    <div className="flex items-center gap-2">
      <button onClick={onAddCar} aria-label="Добавить автомобиль" className="h-10 px-3 rounded-full flex items-center gap-1.5 text-foreground bg-secondary hover:text-primary transition-colors">
        <Icon name="Plus" size={18} />
        <span className="text-sm">Машина</span>
      </button>
      <button onClick={onReminders} aria-label="Напоминания" className="relative w-10 h-10 rounded-full grid place-items-center bg-secondary text-foreground hover:text-primary transition-colors">
        <Icon name="Bell" size={20} />
        {alerts > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-destructive text-white text-[12px] leading-5 text-center font-semibold">{alerts}</span>
        )}
      </button>
      <button onClick={onProfile} aria-label="Профиль" className="w-10 h-10 rounded-full grid place-items-center bg-secondary text-foreground hover:text-primary transition-colors">
        <Icon name="CircleUserRound" size={20} />
      </button>
    </div>
    </div>
  </header>
);

export default AppHeader;
