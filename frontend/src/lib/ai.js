/* ============================================================================
   Main-thread client for the on-device AI worker.

   Two model roles:
     • the TEXT model answers every text task (chat, summaries, agents…);
     • the VISION model reads images. If the chosen text model is itself
       multimodal (Qwen3.5), it serves both roles and nothing extra downloads.

   Each model asks for download consent once (a sheet rendered by
   <AIConsentSheet/>), then loads from the browser cache on later visits.
   ============================================================================ */
import { useSyncExternalStore } from "react";

export const MODELS = {
  "qwen3-0.6b": {
    id: "onnx-community/Qwen3-0.6B-ONNX", name: "Qwen3 0.6B", kind: "text",
    size: { gpu: 585, cpu: 630 },
    en: "Fastest replies. Text only — images use the vision model. Multilingual, including Arabic.",
    ar: "أسرع الردود. نصوص فقط — الصور تستخدم نموذج الرؤية. متعدد اللغات ومنها العربية.",
  },
  "qwen3.5-0.8b": {
    id: "onnx-community/Qwen3.5-0.8B-ONNX", name: "Qwen3.5 0.8B", kind: "vlm",
    size: { gpu: 810, cpu: 740 },
    en: "Newer and smarter, reads images too — slower on integrated graphics.",
    ar: "أحدث وأذكى ويقرأ الصور أيضًا — أبطأ على بطاقات الرسومات المدمجة.",
  },
  "qwen3.5-2b": {
    id: "onnx-community/Qwen3.5-2B-ONNX", name: "Qwen3.5 2B", kind: "vlm",
    size: { gpu: 2070, cpu: 1770 },
    en: "Best answers and image understanding. Needs a strong graphics card.",
    ar: "أفضل الإجابات وفهم الصور. يحتاج بطاقة رسومات قوية.",
  },
};
export const VISION_DEFAULT = "qwen3.5-0.8b";
export const ASR_MODEL = { id: "onnx-community/whisper-base", name: "Whisper base", size: { gpu: 210, cpu: 81 } };

const MODEL_KEY = "omnicore_ai_model";
const consentKey = (k) => (k === "asr" ? "omnicore_asr_consent" : `omnicore_consent_${k}`);
const cachedKey = (k) => (k === "asr" ? "omnicore_asr_cached" : `omnicore_ai_cached_${k}`);

export function getModelKey() {
  const k = localStorage.getItem(MODEL_KEY);
  return MODELS[k] ? k : "qwen3-0.6b";
}
export const visionKeyFor = (textKey) => (MODELS[textKey]?.kind === "vlm" ? textKey : VISION_DEFAULT);

/* ---------------------------------------------------------------------------
   Observable status
   --------------------------------------------------------------------------- */
let state = {
  modelKey: getModelKey(),
  models: {},               // key -> idle | loading | ready | error
  phase: "idle",            // derived for the text model: idle | consent | loading | ready | error
  consentFor: null,         // model key or "asr" while the consent sheet is open
  loadingKey: null,         // model key (or "asr") currently downloading
  loaded: 0, total: 0,
  device: null, caps: null,
  error: null, notice: null,
  busy: 0,
  asrReady: false,
  lastStats: null,
};
const subs = new Set();
function derivePhase(s) {
  if (s.consentFor) return "consent";
  if (s.loadingKey && s.loadingKey !== "asr") return "loading";
  const m = s.models[s.modelKey];
  return m === "ready" ? "ready" : m === "error" ? "error" : "idle";
}
function set(patch) {
  state = { ...state, ...patch };
  state.phase = derivePhase(state);
  subs.forEach((f) => f());
}
const setModel = (k, v) => set({ models: { ...state.models, [k]: v } });
export const getAIState = () => state;
export function useAI() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, getAIState);
}

/* ---------------------------------------------------------------------------
   Worker plumbing
   --------------------------------------------------------------------------- */
let worker = null;
let seq = 0;
const pending = new Map();

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("./ai.worker.js", import.meta.url), { type: "module" });
  worker.onmessage = (e) => {
    const m = e.data;
    if (m.type === "progress") {
      if (state.loadingKey) set({ loaded: m.loaded, total: m.total });
      return;
    }
    if (m.type === "notice") { set({ notice: m.message }); return; }
    if (m.type === "unloaded") {
      const key = Object.keys(MODELS).find((k) => MODELS[k].id === m.id);
      if (key) setModel(key, "idle");
      return;
    }
    const p = pending.get(m.id);
    if (!p) return;
    if (m.type === "token") { p.onToken?.(m.text); return; }
    pending.delete(m.id);
    if (m.type === "error") p.reject(new Error(m.message));
    else p.resolve(m);
  };
  worker.onerror = (e) => {
    const err = new Error(e.message || "The AI engine stopped unexpectedly. Reload the page to restart it.");
    for (const p of pending.values()) p.reject(err);
    pending.clear();
    const models = Object.fromEntries(Object.keys(state.models).map((k) => [k, "idle"]));
    set({ models, loadingKey: null, error: err.message, busy: 0 });
    worker = null;
  };
  return worker;
}

function call(type, payload = {}, onToken) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onToken });
    getWorker().postMessage({ type, id, ...payload });
  });
}

export async function detectCapabilities() {
  if (state.caps) return state.caps;
  const r = await call("caps");
  set({ caps: r.caps });
  return r.caps;
}

/* ---------------------------------------------------------------------------
   Consent
   --------------------------------------------------------------------------- */
let consentWaiters = [];
export const hasConsent = (k = state.modelKey) => localStorage.getItem(consentKey(k)) === "1";
export function acceptConsent() {
  localStorage.setItem(consentKey(state.consentFor), "1");
  const w = consentWaiters; consentWaiters = [];
  set({ consentFor: null });
  w.forEach((f) => f.resolve());
}
export function declineConsent() {
  const w = consentWaiters; consentWaiters = [];
  set({ consentFor: null });
  const err = new Error("The on-device AI model isn't downloaded yet. You can download it any time from Settings → AI engine.");
  err.ar = "نموذج الذكاء الاصطناعي على الجهاز لم يُنزَّل بعد. يمكنك تنزيله في أي وقت من الإعدادات ← محرك الذكاء الاصطناعي.";
  err.declined = true;
  w.forEach((f) => f.reject(err));
}
async function askConsent(k) {
  if (hasConsent(k)) return;
  // One sheet at a time; a second request waits for the first to resolve.
  while (state.consentFor) await new Promise((r) => setTimeout(r, 150));
  if (hasConsent(k)) return;
  set({ consentFor: k });
  detectCapabilities().catch(() => null);
  await new Promise((resolve, reject) => consentWaiters.push({ resolve, reject }));
}

/* ---------------------------------------------------------------------------
   Loading
   --------------------------------------------------------------------------- */
const inflight = {};
export function ensureModel(key) {
  if (state.models[key] === "ready") return Promise.resolve();
  if (inflight[key]) return inflight[key];
  inflight[key] = (async () => {
    await askConsent(key);
    // Serialise downloads so progress reflects one model at a time.
    while (state.loadingKey && state.loadingKey !== key) await new Promise((r) => setTimeout(r, 200));
    setModel(key, "loading");
    set({ loadingKey: key, loaded: 0, total: 0, error: null, notice: null });
    const r = await call("load", { modelId: MODELS[key].id });
    localStorage.setItem(cachedKey(key), "1");
    setModel(key, "ready");
    set({ loadingKey: null, device: r.device, caps: r.caps, loaded: 0, total: 0 });
  })().catch((e) => {
    if (state.loadingKey === key) set({ loadingKey: null });
    if (!e.declined) { setModel(key, "error"); set({ error: e.message }); }
    throw e;
  }).finally(() => { delete inflight[key]; });
  return inflight[key];
}

export const ensureReady = () => ensureModel(state.modelKey);
export const isModelCached = (k = state.modelKey) => localStorage.getItem(cachedKey(k)) === "1";

/** True only if the model's weight files are really in Cache Storage (a full
    or private-mode browser can refuse to store them even after a load). */
async function weightsInCache(key) {
  try {
    const id = MODELS[key].id;
    for (const name of await caches.keys()) {
      if (!name.includes("transformers")) continue;
      const reqs = await (await caches.open(name)).keys();
      if (reqs.some((r) => r.url.includes(id) && /\.onnx(_data)?$/.test(r.url))) return true;
    }
  } catch { /* Cache Storage unavailable */ }
  return false;
}

/** Load the text model in the background — only if its weights are already
    cached, so this never starts a large download without the user asking. */
export function warmIfCached() {
  const k = state.modelKey;
  if (state.models[k] || !hasConsent(k) || !isModelCached(k)) return;
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1500));
  idle(async () => {
    if (await weightsInCache(k)) ensureModel(k).catch(() => {});
    else localStorage.removeItem(cachedKey(k));
  });
}

export async function switchModel(key) {
  if (!MODELS[key] || key === state.modelKey) return;
  localStorage.setItem(MODEL_KEY, key);
  set({ modelKey: key, error: null });
}

export async function clearModelCache() {
  try {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.includes("transformers")).map((n) => caches.delete(n)));
  } catch { /* Cache Storage unavailable */ }
  [...Object.keys(MODELS), "asr"].forEach((k) => localStorage.removeItem(cachedKey(k)));
  await call("unload").catch(() => {});
  set({ models: {}, device: null, asrReady: false });
}

export async function modelCacheSize() {
  try {
    const names = (await caches.keys()).filter((n) => n.includes("transformers"));
    let bytes = 0, files = 0;
    for (const n of names) {
      const c = await caches.open(n);
      for (const req of await c.keys()) {
        const res = await c.match(req);
        bytes += Number(res?.headers.get("content-length")) || 0;
        files++;
      }
    }
    return { bytes, files };
  } catch {
    return { bytes: 0, files: 0 };
  }
}

/* ---------------------------------------------------------------------------
   Generation
   --------------------------------------------------------------------------- */
export async function generate({ system, messages, prompt, images = [], maxTokens = 512, temperature = 0.7, onToken, imageMaxSide }) {
  const key = images.length ? visionKeyFor(state.modelKey) : state.modelKey;
  await ensureModel(key);
  const msgs = messages || [{ role: "user", content: prompt }];
  set({ busy: state.busy + 1 });
  try {
    const r = await call("generate", {
      modelId: MODELS[key].id, system, messages: msgs, images, maxTokens, temperature, imageMaxSide,
    }, onToken);
    set({ lastStats: r.stats });
    return r.text;
  } finally {
    set({ busy: Math.max(0, state.busy - 1) });
  }
}

export function stopGenerating() {
  worker?.postMessage({ type: "interrupt" });
}

/**
 * Ask for a JSON object and parse it tolerantly: small models sometimes wrap
 * JSON in prose or code fences. Returns `fallback(raw)` when nothing parses.
 */
export async function generateJSON(opts, fallback) {
  const raw = await generate({ temperature: 0.2, ...opts });
  return parseJSONLoose(raw) ?? fallback(raw);
}

export function parseJSONLoose(raw) {
  const s = String(raw || "").replace(/```(?:json)?/gi, "").trim();
  const start = s.indexOf("{");
  if (start < 0) return null;
  for (let end = s.lastIndexOf("}"); end > start; end = s.lastIndexOf("}", end - 1)) {
    try { return JSON.parse(s.slice(start, end + 1)); } catch { /* try a shorter span */ }
  }
  return null;
}

/* ---------------------------------------------------------------------------
   Speech recognition (Whisper)
   --------------------------------------------------------------------------- */
export async function transcribe(audio, lang = "en") {
  await askConsent("asr");
  const first = !state.asrReady;
  if (first) set({ loadingKey: "asr", loaded: 0, total: 0 });
  set({ busy: state.busy + 1 });
  try {
    const r = await call("transcribe", { audio, language: lang });
    localStorage.setItem(cachedKey("asr"), "1");
    set({ asrReady: true });
    return r.text;
  } finally {
    set({ busy: Math.max(0, state.busy - 1), ...(state.loadingKey === "asr" ? { loadingKey: null, loaded: 0, total: 0 } : {}) });
  }
}

/* ---------------------------------------------------------------------------
   Sizes & progress
   --------------------------------------------------------------------------- */
export function sizeOf(key, caps = state.caps) {
  const gpu = caps?.webgpu;
  if (key === "asr") return gpu ? ASR_MODEL.size.gpu : ASR_MODEL.size.cpu;
  const m = MODELS[key];
  return m ? (gpu ? m.size.gpu : m.size.cpu) : 0;
}
/** Progress never reads 100% before every file has actually started downloading. */
export function progressOf(st = state) {
  if (!st.loadingKey) return null;
  const denom = Math.max(st.total || 0, sizeOf(st.loadingKey, st.caps) * 1e6);
  return denom ? Math.min(1, (st.loaded || 0) / denom) : null;
}
export const loadingName = (st = state) => (st.loadingKey === "asr" ? ASR_MODEL.name : MODELS[st.loadingKey]?.name || "");

export const fmtMB = (mb) => (mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${Math.round(mb)} MB`);
export const fmtBytes = (b) => fmtMB(b / 1e6);
