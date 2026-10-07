import * as React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => undefined));
}

const resetZoom = () => {
  const vv = window.visualViewport;
  if (!vv || vv.scale <= 1.01) return;
  const meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return;
  const c = meta.getAttribute("content") || "";
  meta.setAttribute("content", c + ", width=device-width");
  requestAnimationFrame(() => meta.setAttribute("content", c));
};
document.addEventListener("focusout", () => setTimeout(resetZoom, 150));
window.visualViewport?.addEventListener("resize", () => setTimeout(resetZoom, 300));
document.addEventListener("gesturestart", (e) => {
  if (!(e.target as HTMLElement)?.closest?.(".leaflet-container")) e.preventDefault();
});