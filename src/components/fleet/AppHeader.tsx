import Icon from "@/components/ui/icon";

export type HeadLink = "cars" | "service" | "insurance" | "docs";

interface Props {
  active: HeadLink;
  onNavigate: (to: HeadLink) => void;
  onAddCar: () => void;
  onProfile: () => void;
}

const LINKS: { id: HeadLink; label: string }[] = [
  { id: "cars", label: "Машины" },
  { id: "service", label: "ТО" },
  { id: "insurance", label: "Страховки" },
  { id: "docs", label: "Документы" },
];

const AppHeader = ({ active, onNavigate, onAddCar, onProfile }: Props) => (
  <header className="[grid-area:head] relative z-10 flex items-center justify-between md:justify-center gap-4 md:gap-11 px-5 text-[0.8rem] bg-background border-b border-border">
    <b className="font-medium tracking-[0.02em] text-foreground whitespace-nowrap">Твой автопарк</b>
    <div className="hidden md:flex items-center gap-11">
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
    <div className="md:absolute md:right-[90px] flex items-center gap-5">
      <button onClick={onAddCar} aria-label="Добавить автомобиль" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
        <Icon name="Plus" size={16} />
        <span className="hidden sm:inline">Машина</span>
      </button>
      <button onClick={onProfile} aria-label="Профиль" className="text-muted-foreground hover:text-primary transition-colors">
        <Icon name="CircleUserRound" size={18} />
      </button>
    </div>
  </header>
);

export default AppHeader;
