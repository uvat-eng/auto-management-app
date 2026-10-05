import Icon from "@/components/ui/icon";

interface Props {
  onClick: () => void;
  label?: string;
  className?: string;
}

const BackButton = ({ onClick, label = "Назад", className = "" }: Props) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 h-10 pl-2 pr-4 rounded-full bg-secondary text-foreground font-medium text-sm active:scale-95 transition-transform hover:text-gold-link ${className}`}
  >
    <Icon name="ChevronLeft" size={20} />
    {label}
  </button>
);

export default BackButton;
