type Sentinel = { release: () => Promise<void>; addEventListener: (t: string, f: () => void) => void };

let sentinel: Sentinel | null = null;
let video: HTMLVideoElement | null = null;
let wanted = false;

const native = () => (window as unknown as { AvtoparkNative?: { keepAwake?: (on: boolean) => void } }).AvtoparkNative;

const lockApi = async () => {
  const wl = (navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<Sentinel> } }).wakeLock;
  if (!wl) return false;
  try {
    sentinel = await wl.request("screen");
    sentinel.addEventListener("release", () => {
      sentinel = null;
    });
    return true;
  } catch {
    return false;
  }
};

const lockVideo = () => {
  if (!video) {
    video = document.createElement("video");
    video.src = "/keepawake.mp4";
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("muted", "");
    video.style.cssText = "position:fixed;width:1px;height:1px;opacity:0.01;pointer-events:none;left:0;top:0;";
    document.body.appendChild(video);
  }
  video.play().catch(() => undefined);
};

const onVisible = () => {
  if (wanted && document.visibilityState === "visible") acquire();
};

const acquire = async () => {
  native()?.keepAwake?.(true);
  if (sentinel) return;
  if (!(await lockApi())) lockVideo();
};

export const keepAwake = (on: boolean) => {
  wanted = on;
  if (on) {
    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return;
  }
  document.removeEventListener("visibilitychange", onVisible);
  native()?.keepAwake?.(false);
  sentinel?.release().catch(() => undefined);
  sentinel = null;
  if (video) {
    video.pause();
    video.remove();
    video = null;
  }
};
