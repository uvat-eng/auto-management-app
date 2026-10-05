const MUTE_KEY = "avtopark-voice-muted";

let voice: SpeechSynthesisVoice | null = null;

const pickVoice = () => {
  if (!("speechSynthesis" in window)) return;
  const all = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("ru"));
  voice = all.find((v) => /milena|google|yandex|irina|pavel/i.test(v.name)) ?? all[0] ?? null;
};

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
}

export const voiceSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;
export const isMuted = () => localStorage.getItem(MUTE_KEY) === "1";
export const setMuted = (v: boolean) => {
  localStorage.setItem(MUTE_KEY, v ? "1" : "0");
  if (v && voiceSupported()) window.speechSynthesis.cancel();
};

export const say = (text: string, force = false) => {
  if (!voiceSupported() || (isMuted() && !force)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ru-RU";
  if (voice) u.voice = voice;
  u.rate = 1.05;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
};

export const spokenDistance = (m: number) => {
  if (m >= 1000) {
    const km = Math.round(m / 100) / 10;
    return km === 1 ? "1 километр" : `${String(km).replace(".", ",")} километра`;
  }
  const r = m >= 300 ? Math.round(m / 100) * 100 : Math.round(m / 50) * 50;
  return `${r} метров`;
};

export const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
