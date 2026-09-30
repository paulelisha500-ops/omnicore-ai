/* In-process event bus. Modules announce what happened ("document.analyzed",
   "prediction.high_risk", …); the automation engine and live UI listen. */
const handlers = new Map();

export function on(type, fn) {
  if (!handlers.has(type)) handlers.set(type, new Set());
  handlers.get(type).add(fn);
  return () => handlers.get(type)?.delete(fn);
}

export function emit(type, payload) {
  for (const key of [type, "*"]) {
    for (const fn of handlers.get(key) || []) {
      try { fn(payload, type); } catch (e) { console.error(`[bus] ${type} handler failed`, e); }
    }
  }
}
