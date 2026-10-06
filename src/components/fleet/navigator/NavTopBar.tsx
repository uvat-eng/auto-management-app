import Icon from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Place, formatDist } from "@/lib/maps";

interface Props {
  driving: boolean;
  step?: { text: string };
  stepDist: number;
  query: string;
  setQuery: (v: string) => void;
  searching: boolean;
  results: Place[];
  doSearch: (e: React.FormEvent) => void;
  onPick: (r: Place) => void;
}

const NavTopBar = ({ driving, step, stepDist, query, setQuery, searching, results, doSearch, onPick }: Props) =>
  driving && step ? (
    <div className="absolute left-3 right-3 nav-top z-[500] rounded-3xl bg-card/95 backdrop-blur border border-border p-4 flex items-center gap-4 animate-fade-in">
      <span className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground grid place-items-center shrink-0">
        <Icon name="Navigation" size={22} />
      </span>
      <div className="min-w-0">
        <p className="font-head text-2xl font-semibold text-gold leading-none">{formatDist(stepDist)}</p>
        <p className="text-sm mt-1 truncate">{step.text}</p>
      </div>
    </div>
  ) : (
    <div className="absolute left-3 right-3 nav-top z-[500] space-y-2">
      <form onSubmit={doSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Icon name="Search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Куда едем?"
            enterKeyHint="search"
            className="h-12 pl-10 rounded-full bg-card/95 backdrop-blur border-border"
          />
        </div>
        <button type="submit" disabled={searching} className="h-12 w-12 rounded-full bg-primary text-primary-foreground grid place-items-center shrink-0">
          <Icon name={searching ? "Loader" : "ArrowRight"} size={18} className={searching ? "animate-spin" : ""} />
        </button>
      </form>
      {results.length > 0 && (
        <div className="rounded-3xl bg-card/95 backdrop-blur border border-border overflow-hidden max-h-[40dvh] overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => onPick(r)}
              className="w-full text-left px-4 py-3 text-sm border-b border-border last:border-0 hover:bg-secondary"
            >
              <span className="line-clamp-2">{r.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

export default NavTopBar;
