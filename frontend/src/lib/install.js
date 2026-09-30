/* "Install app" support (Progressive Web App).
   Chrome/Edge/Android fire `beforeinstallprompt`; we hold it until the user
   presses Install. iPhone/iPad Safari has no prompt API, so the UI shows the
   Share → Add to Home Screen steps instead. Inside the Hugging Face page the
   app runs in an iframe, where installing isn't possible — the button opens
   the full app in its own tab, where it can be installed. */
import { useSyncExternalStore } from "react";

export const APP_URL = "https://elisha622-omnicore-ai.static.hf.space/";

let deferred = null;
let installed = false;
const subs = new Set();
const emit = () => subs.forEach((f) => f());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; emit(); });
  window.addEventListener("appinstalled", () => { installed = true; deferred = null; emit(); });
}

const inFrame = () => { try { return window.self !== window.top; } catch { return true; } };
const standalone = () => window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

function snapshot() {
  if (installed || standalone()) return "installed";
  if (inFrame()) return "frame";
  if (deferred) return "prompt";
  if (isIOS()) return "ios";
  return "unsupported";
}
let last = null;
const get = () => { const s = snapshot(); if (s !== last) last = s; return last; };

/** "prompt" | "ios" | "frame" | "installed" | "unsupported" */
export function useInstallState() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, get);
}

export async function install() {
  const state = snapshot();
  if (state === "frame") { window.open(APP_URL, "_blank", "noopener"); return "opened"; }
  if (state === "prompt" && deferred) {
    const e = deferred; deferred = null; emit();
    await e.prompt();
    const choice = await e.userChoice.catch(() => ({ outcome: "dismissed" }));
    return choice.outcome;
  }
  return state;
}
