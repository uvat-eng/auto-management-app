import Icon from "@/components/ui/icon";
import { LAYERS } from "@/lib/maps";
import { say, setMuted, voiceSupported } from "@/lib/voice";
import { Mode } from "./navUtils";

interface Props {
  target: boolean;
  mode: Mode;
  turn: number;
  full: boolean;
  muted: boolean;
  setMutedState: (v: boolean) => void;
  follow: boolean;
  hasPos: boolean;
  layersOpen: boolean;
  setLayersOpen: (fn: (v: boolean) => boolean) => void;
  layerId: string;
  setLayerId: (id: string) => void;
  switchMode: () => void;
  openFull: () => void;
  closeFull: () => void;
  openOffline: () => void;
  onLocate: () => void;
}

const NavControls = ({
  target,
  mode,
  turn,
  full,
  muted,
  setMutedState,
  follow,
  hasPos,
  layersOpen,
  setLayersOpen,
  layerId,
  setLayerId,
  switchMode,
  openFull,
  closeFull,
  openOffline,
  onLocate,
}: Props) => (
  <>
    <div className={`absolute right-3 z-[500] flex flex-col gap-2 ${target ? "bottom-36" : "nav-bottom"}`}>
      <button onClick={switchMode} aria-label={mode === "north" ? "Карта по курсу" : "Север сверху"} className="nav-fab relative">
        {mode === "north" ? (
          <span className="flex flex-col items-center leading-none">
            <Icon name="Navigation2" size={16} className="text-destructive" />
            <span className="text-[11px] font-semibold mt-0.5">С</span>
          </span>
        ) : (
          <span className="flex flex-col items-center leading-none" style={{ transform: `rotate(${turn}deg)` }}>
            <Icon name="Navigation2" size={16} className="text-destructive" />
            <span className="text-[11px] font-semibold mt-0.5">С</span>
          </span>
        )}
      </button>
      <button onClick={full ? closeFull : openFull} aria-label={full ? "Свернуть" : "На весь экран"} className="nav-fab">
        <Icon name={full ? "Minimize2" : "Maximize2"} size={20} />
      </button>
      {voiceSupported() && (
        <button
          onClick={() => {
            setMuted(!muted);
            setMutedState(!muted);
            if (muted) say("Голосовые подсказки включены", true);
          }}
          aria-label={muted ? "Включить голос" : "Выключить голос"}
          className={`nav-fab ${muted ? "text-muted-foreground" : "!text-primary"}`}
        >
          <Icon name={muted ? "VolumeX" : "Volume2"} size={20} />
        </button>
      )}
      <button onClick={() => setLayersOpen((v) => !v)} aria-label="Слои карты" className="nav-fab">
        <Icon name="Layers" size={20} />
      </button>
      <button onClick={openOffline} aria-label="Карты без интернета" className="nav-fab">
        <Icon name="Download" size={20} />
      </button>
      <button onClick={onLocate} aria-label="Где я" className={`nav-fab ${follow && hasPos ? "!text-primary" : ""}`}>
        <Icon name="LocateFixed" size={20} />
      </button>
    </div>

    {layersOpen && (
      <div className="absolute right-16 nav-bottom z-[500] w-64 rounded-3xl bg-card/95 backdrop-blur border border-border p-2 animate-fade-in">
        {LAYERS.map((l) => (
          <button
            key={l.id}
            onClick={() => {
              setLayerId(l.id);
              setLayersOpen(() => false);
            }}
            className={`w-full text-left rounded-2xl px-3 py-2.5 ${l.id === layerId ? "bg-secondary" : "hover:bg-secondary/60"}`}
          >
            <p className={`text-sm font-medium ${l.id === layerId ? "text-gold" : ""}`}>{l.label}</p>
            <p className="text-xs text-muted-foreground">{l.hint}</p>
          </button>
        ))}
      </div>
    )}
  </>
);

export default NavControls;
