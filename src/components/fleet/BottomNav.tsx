import Icon from "@/components/ui/icon";

export type Tab = "fleet" | "service" | "reminders";

interface Props {
  tab: Tab;
  onChange: (t: Tab) => void;
  alerts: number;
}

const ITEMS: { id: Tab; label: string; icon: string }[] = [
  { id: "fleet", label: "Автопарк", icon: "CarFront" },
  { id: "service", label: "Обслуживание", icon: "Wrench" },
  { id: "reminders", label: "Напоминания", icon: "Bell" },
];

const BottomNav = ({ tab, onChange, alerts }: Props) => (
  <nav className="[grid-area:nav] flex justify-around md:justify-center md:gap-16 items-center border-t border-border bg-background text-muted-foreground text-[0.85em] pb-[env(safe-area-inset-bottom)]">
    {ITEMS.map((it) => (
      <button
        key={it.id}
        onClick={() => onChange(it.id)}
        className={`relative flex items-center gap-2 py-2 transition-colors ${tab === it.id ? "text-foreground" : "hover:text-foreground"}`}
      >
        <Icon name={it.icon} size={16} className="md:hidden" />
        <span>{it.label}</span>
        {it.id === "reminders" && alerts > 0 && (
          <span className="absolute -top-0.5 -right-3 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-4 text-center font-semibold">
            {alerts}
          </span>
        )}
      </button>
    ))}
  </nav>
);

export default BottomNav;
