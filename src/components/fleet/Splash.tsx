import { useCallback, useEffect, useRef, useState } from "react";

const SEEN_KEY = "avtopark-splash";
const DURATION = 5000;

type Phase = "check" | "tap" | "play";

const Splash = () => {
  const [show, setShow] = useState(() => !sessionStorage.getItem(SEEN_KEY) && !/^\/(privacy|support)/.test(window.location.pathname));
  const [phase, setPhase] = useState<Phase>("check");
  const [leaving, setLeaving] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const timers = useRef<number[]>([]);

  const close = useCallback((delay = 400) => {
    setLeaving(true);
    timers.current.push(window.setTimeout(() => setShow(false), delay));
  }, []);

  const start = useCallback(() => {
    setPhase("play");
    timers.current.push(window.setTimeout(() => setLeaving(true), DURATION - 500));
    timers.current.push(window.setTimeout(() => setShow(false), DURATION));
  }, []);

  useEffect(() => {
    if (!show) return;
    sessionStorage.setItem(SEEN_KEY, "1");
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session) session.type = "playback";
    const a = new Audio("/intro-v2.mp3");
    a.preload = "auto";
    a.volume = 0.8;
    audio.current = a;
    let alive = true;
    a.play()
      .then(() => alive && start())
      .catch(() => alive && setPhase("tap"));
    const list = timers.current;
    return () => {
      alive = false;
      list.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (show || !audio.current) return;
    const a = audio.current;
    const fade = setInterval(() => {
      a.volume = Math.max(0, a.volume - 0.1);
      if (a.volume <= 0) {
        a.pause();
        clearInterval(fade);
      }
    }, 60);
    return () => clearInterval(fade);
  }, [show]);

  if (!show) return null;

  const onTap = () => {
    if (phase === "tap") {
      const a = audio.current;
      if (a) {
        a.currentTime = 0;
        a.play().catch(() => undefined);
      }
      start();
      return;
    }
    if (phase === "play") close();
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center transition-opacity duration-500 select-none ${leaving ? "opacity-0" : "opacity-100"}`}
      onClick={onTap}
    >
      {phase === "play" ? (
        <>
          <div className="relative flex items-center justify-center w-[min(86vw,460px)] aspect-[1968/1134]">
            <img src="/wolves-l.png" alt="" className="splash-wolf-left h-full w-1/2 object-contain object-right" />
            <img src="/wolves-r.png" alt="" className="splash-wolf-right h-full w-1/2 object-contain object-left" />
            <span className="splash-glow absolute inset-0 pointer-events-none" />
          </div>
          <p className="splash-title mt-8 font-head text-white text-xl tracking-[0.4em] uppercase">Твой автопарк</p>
        </>
      ) : (
        <div className={`flex flex-col items-center transition-opacity duration-500 ${phase === "tap" ? "opacity-100" : "opacity-0"}`}>
          <div className="relative w-[min(70vw,360px)] aspect-[1968/1134] flex opacity-40">
            <img src="/wolves-l.png" alt="" className="h-full w-1/2 object-contain object-right" />
            <img src="/wolves-r.png" alt="" className="h-full w-1/2 object-contain object-left" />
          </div>
          <p className="mt-8 font-head text-white text-xl tracking-[0.4em] uppercase">Твой автопарк</p>
          <p className="mt-10 text-white/70 text-base animate-pulse">Коснитесь экрана</p>
        </div>
      )}
    </div>
  );
};

export default Splash;