import { useEffect, useRef, useState } from "react";

const SEEN_KEY = "avtopark-splash";
const DURATION = 5000;

const Splash = () => {
  const [show, setShow] = useState(() => !sessionStorage.getItem(SEEN_KEY));
  const [leaving, setLeaving] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!show) return;
    sessionStorage.setItem(SEEN_KEY, "1");
    const a = new Audio("/intro-v2.mp3");
    a.volume = 0.8;
    audio.current = a;
    let played = false;
    const play = () => {
      if (played) return;
      a.play()
        .then(() => (played = true))
        .catch(() => undefined);
    };
    play();
    window.addEventListener("pointerdown", play, { once: true });
    const t1 = setTimeout(() => setLeaving(true), DURATION - 500);
    const t2 = setTimeout(() => setShow(false), DURATION);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("pointerdown", play);
    };
  }, [show]);

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

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center transition-opacity duration-500 ${leaving ? "opacity-0" : "opacity-100"}`}
      onClick={() => {
        setLeaving(true);
        setTimeout(() => setShow(false), 400);
      }}
    >
      <div className="relative flex items-center justify-center w-[min(86vw,460px)] aspect-[1968/1134]">
        <img src="/wolves-l.png" alt="" className="splash-wolf-left h-full w-1/2 object-contain object-right" />
        <img src="/wolves-r.png" alt="" className="splash-wolf-right h-full w-1/2 object-contain object-left" />
        <span className="splash-glow absolute inset-0 pointer-events-none" />
      </div>
      <p className="splash-title mt-8 font-head text-white text-xl tracking-[0.4em] uppercase">Твой автопарк</p>
    </div>
  );
};

export default Splash;
