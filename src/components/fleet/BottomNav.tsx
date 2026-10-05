import Icon from "@/components/ui/icon";

export type Tab = "fleet" | "service" | "map" | "reminders";

interface Props {
  tab: Tab;
  onChange: (t: Tab) => void;
  alerts: number;
}

const ITEMS: { id: Tab; label: string; icon: string }[] = [
  { id: "fleet", label: "Машины", icon: "CarFront" },
  { id: "service", label: "ТО", icon: "Wrench" },
  { id: "map", label: "Навигатор", icon: "Navigation" },
  { id: "reminders", label: "Сроки", icon: "Bell" },
];

const BottomNav = ({ tab, onChange, alerts }: Props) => (
  <nav className="[grid-area:nav] relative z-10 grid grid-cols-4 gap-1.5 px-3 pb-2.5 md:flex md:justify-center md:gap-3 bg-background border-b border-border">
    {ITEMS.map((it) => (
      <button
        key={it.id}
        onClick={() => onChange(it.id)}
        className={`relative flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 h-[58px] md:h-11 md:px-6 rounded-2xl text-[13px] md:text-sm font-medium transition-colors ${
          tab === it.id ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground/80 hover:text-foreground"
        }`}
      >
        <Icon name={it.icon} size={20} />
        <span>{it.label}</span>
        {it.id === "reminders" && alerts > 0 && (
          <span className="absolute top-1.5 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[12.5px] leading-[18px] text-center font-semibold">
            {alerts}
          </span>
        )}
      </button>
    ))}
  </nav>
);

export default BottomNav;
