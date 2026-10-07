import { ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

const InfoPage = ({ title, subtitle, children }: Props) => (
  <div className="min-h-[100dvh] bg-background text-foreground">
    <div className="max-w-2xl mx-auto px-6 pt-[calc(env(safe-area-inset-top)+32px)] pb-16">
      <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
        ← Твой автопарк
      </Link>
      <h1 className="font-head text-3xl md:text-4xl mt-6">{title}</h1>
      {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
      <div className="mt-8">{children}</div>
      <div className="mt-12 pt-6 border-t border-border flex gap-6 text-sm text-muted-foreground">
        <Link to="/privacy" className="hover:text-primary">Конфиденциальность</Link>
        <Link to="/support" className="hover:text-primary">Поддержка</Link>
      </div>
    </div>
  </div>
);

export default InfoPage;
