import Icon from "@/components/ui/icon";
import { Place, Route, formatDist, formatDur } from "@/lib/maps";

interface Props {
  target: Place;
  route: Route | null;
  driving: boolean;
  routing: boolean;
  onStop: () => void;
  startDrive: () => void;
  makeRoute: () => void;
  reset: () => void;
}

const NavRoutePanel = ({ target, route, driving, routing, onStop, startDrive, makeRoute, reset }: Props) => (
  <div className="absolute left-3 right-3 nav-bottom-panel z-[500] rounded-3xl bg-card/95 backdrop-blur border border-border p-4 animate-fade-in">
    {route ? (
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-head text-2xl font-semibold leading-none">{formatDur(route.duration)}</p>
          <p className="text-sm text-muted-foreground mt-1">{formatDist(route.distance)}</p>
        </div>
        {driving ? (
          <button onClick={onStop} className="h-12 px-5 rounded-full bg-secondary font-medium">
            Стоп
          </button>
        ) : (
          <button onClick={startDrive} className="h-12 px-5 rounded-full bg-primary text-primary-foreground font-medium inline-flex items-center gap-2 shrink-0">
            <Icon name="Navigation" size={18} /> Поехали
          </button>
        )}
        <button onClick={reset} aria-label="Сбросить" className="h-12 w-12 rounded-full border border-border grid place-items-center text-muted-foreground">
          <Icon name="X" size={18} />
        </button>
      </div>
    ) : (
      <div className="space-y-3">
        <p className="text-sm line-clamp-2">{target.name}</p>
        <div className="flex gap-2">
          <button onClick={() => makeRoute()} disabled={routing} className="flex-1 h-12 rounded-full bg-primary text-primary-foreground font-medium inline-flex items-center justify-center gap-2 disabled:opacity-80">
            <Icon name={routing ? "Loader" : "Route"} size={18} className={routing ? "animate-spin" : ""} /> {routing ? "Строим маршрут…" : "Маршрут"}
          </button>
          <button onClick={reset} aria-label="Сбросить" className="h-12 w-12 rounded-full border border-border grid place-items-center text-muted-foreground">
            <Icon name="X" size={18} />
          </button>
        </div>
      </div>
    )}
  </div>
);

export default NavRoutePanel;
