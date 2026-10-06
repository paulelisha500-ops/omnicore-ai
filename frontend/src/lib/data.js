/* ============================================================================
   Workspace data: knowledge documents, chat threads, activity, notifications
   and per-module records — plus the React hooks that keep screens in sync.
   ============================================================================ */
import { useCallback, useEffect, useRef, useState } from "react";
import { db, onDbChange, uid } from "./db.js";
import { emit } from "./bus.js";

export const errText = (e, lang) => (lang === "ar" && e?.ar) ? e.ar : (e?.message || String(e));

/** Live query over one store, filtered to an owner (or everything when owner is "*"). */
export function useOwned(store, owner, { sort = (a, b) => (b.updatedAt || b.at || b.createdAt || 0) - (a.updatedAt || a.at || a.createdAt || 0), filter } = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const sortRef = useRef(sort); sortRef.current = sort;
  const filterRef = useRef(filter); filterRef.current = filter;

  const load = useCallback(async () => {
    if (!owner) { setRows([]); setLoading(false); return; }
    try {
      let list = owner === "*" ? await db.all(store) : await db.byOwner(store, owner);
      if (filterRef.current) list = list.filter(filterRef.current);
      list.sort(sortRef.current);
      setRows(list);
    } catch (e) {
      console.error(`[data] ${store}`, e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [store, owner]);

  useEffect(() => {
    load();
    return onDbChange((s) => { if (s === store) load(); });
  }, [load, store]);

  return [rows, loading, load];
}

/* ---------------------------------------------------------------------------
   Knowledge base
   --------------------------------------------------------------------------- */
export async function addDoc(owner, { title, content, source = "manual", meta = {} }) {
  const body = String(content || "").trim();
  if (!body) throw new Error("Document is empty.");
  const doc = {
    id: uid(), owner, source, meta,
    title: (String(title || "").trim() || body.split("\n")[0]).slice(0, 120),
    content: body,
    createdAt: Date.now(), updatedAt: Date.now(),
  };
  await db.put("docs", doc);
  // Docs saved *by* an automation are logged under the automation module, which
  // the engine ignores — otherwise a "doc added → save doc" rule would loop.
  await logEvent(owner, source === "automation" ? "automation" : "knowledge", "kb.added", doc.title, { docId: doc.id });
  return doc;
}

export const removeDoc = (id) => db.delete("docs", id);

/* ---------------------------------------------------------------------------
   Chat threads (messages embedded; a thread is small and read as a unit)
   --------------------------------------------------------------------------- */
export async function createThread(owner, title = "") {
  const t = { id: uid(), owner, title, messages: [], createdAt: Date.now(), updatedAt: Date.now() };
  await db.put("threads", t);
  return t;
}

export async function saveThread(thread) {
  const t = { ...thread, updatedAt: Date.now() };
  await db.put("threads", t);
  return t;
}

export const deleteThread = (id) => db.delete("threads", id);

/* ---------------------------------------------------------------------------
   Activity log. Every meaningful action is persisted (feeding the dashboard
   trend, the profile timeline and the admin audit log) and announced on the
   bus as an app event, which is what automation triggers listen for.
   --------------------------------------------------------------------------- */
export async function logEvent(owner, module, action, detail = "", data = {}) {
  if (!owner) return null;
  const ev = { id: uid(), owner, module, action, detail: String(detail || "").slice(0, 400), data, at: Date.now() };
  try { await db.put("events", ev); } catch (e) { console.error("[data] logEvent", e); }
  emit("app-event", ev);
  return ev;
}

export async function clearEvents(owner) {
  const rows = owner === "*" ? await db.all("events") : await db.byOwner("events", owner);
  await db.deleteMany("events", rows.map((r) => r.id));
}

/** Daily counts for the last `days` days, zero-filled so the axis stays honest. */
export function dailyTrend(events, days = 14) {
  const byDay = new Map();
  for (const e of events) {
    const d = new Date(e.at); d.setHours(0, 0, 0, 0);
    byDay.set(d.getTime(), (byDay.get(d.getTime()) || 0) + 1);
  }
  const out = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    out.push({ d: d.toISOString().slice(0, 10), label: `${d.getMonth() + 1}/${d.getDate()}`, v: byDay.get(d.getTime()) || 0 });
  }
  return out;
}

/* ---------------------------------------------------------------------------
   Notifications
   --------------------------------------------------------------------------- */
export async function notify(owner, { title, body = "", kind = "info", module = "" }) {
  const n = { id: uid(), owner, title: String(title).slice(0, 140), body: String(body).slice(0, 600), kind, module, read: false, at: Date.now() };
  await db.put("notifications", n);
  emit("notification", n);
  return n;
}

export async function markAllRead(owner) {
  const rows = await db.byOwner("notifications", owner);
  await db.putMany("notifications", rows.filter((n) => !n.read).map((n) => ({ ...n, read: true })));
}

export async function clearNotifications(owner) {
  const rows = await db.byOwner("notifications", owner);
  await db.deleteMany("notifications", rows.map((n) => n.id));
}

/* ---------------------------------------------------------------------------
   Records: per-module history (vision analyses, predictions, agent runs, …)
   --------------------------------------------------------------------------- */
export async function addRecord(owner, kind, payload) {
  const r = { id: uid(), owner, kind, ...payload, at: Date.now() };
  await db.put("records", r);
  return r;
}

export const deleteRecord = (id) => db.delete("records", id);

export function useRecords(owner, kind) {
  return useOwned("records", owner, { filter: (r) => r.kind === kind, sort: (a, b) => b.at - a.at });
}

/* ---------------------------------------------------------------------------
   Key-value preferences (per user where it matters)
   --------------------------------------------------------------------------- */
export async function getPref(key, fallback = null) {
  try { return (await db.get("kv", key))?.value ?? fallback; } catch { return fallback; }
}
export const setPref = (key, value) => db.put("kv", { key, value });

/* ---------------------------------------------------------------------------
   Export / import / wipe
   --------------------------------------------------------------------------- */
const OWNED = ["docs", "threads", "events", "automations", "integrations", "notifications", "records"];

export async function exportWorkspace(owner) {
  const out = { format: "omnicore-workspace", version: 1, exportedAt: new Date().toISOString(), owner };
  for (const s of OWNED) out[s] = await db.byOwner(s, owner);
  return out;
}

// Fields in one row that point at a row in another store, so they can follow
// an id that was reassigned on import.
const EVENT_REFS = { docId: "docs", threadId: "threads", recordId: "records", ruleId: "automations" };

export async function importWorkspace(owner, data) {
  if (!data || data.format !== "omnicore-workspace") throw new Error("That file isn't an OmniCore workspace export.");
  // Re-own everything to the importing user. A row keeps its id when that id
  // is free or already the importer's, so re-importing the same file updates
  // rows instead of duplicating them. An id held by another account gets a
  // fresh one — otherwise the import would overwrite that account's row and
  // take it over.
  const rows = {};
  const remap = {};
  for (const s of OWNED) {
    const taken = new Map((await db.all(s)).map((r) => [r.id, r.owner]));
    remap[s] = new Map();
    rows[s] = (Array.isArray(data[s]) ? data[s] : []).filter((r) => r && r.id).map((r) => {
      if (!taken.has(r.id) || taken.get(r.id) === owner) return { ...r, owner };
      const id = uid();
      remap[s].set(r.id, id);
      return { ...r, id, owner };
    });
  }
  const follow = (store, id) => remap[store].get(id) ?? id;
  rows.automations = rows.automations.map((r) => (r.integrationId ? { ...r, integrationId: follow("integrations", r.integrationId) } : r));
  rows.events = rows.events.map((r) => {
    if (!r.data || typeof r.data !== "object") return r;
    const d = { ...r.data };
    for (const [k, store] of Object.entries(EVENT_REFS)) if (d[k]) d[k] = follow(store, d[k]);
    return { ...r, data: d };
  });
  let n = 0;
  for (const s of OWNED) {
    await db.putMany(s, rows[s]);
    n += rows[s].length;
  }
  return n;
}

export async function wipeWorkspace(owner) {
  for (const s of OWNED) {
    const rows = await db.byOwner(s, owner);
    await db.deleteMany(s, rows.map((r) => r.id));
  }
}

export function download(filename, text, type = "application/json") {
  const blob = text instanceof Blob ? text : new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function timeAgo(ts, lang = "en") {
  const s = Math.round((Date.now() - ts) / 1000);
  const rtf = new Intl.RelativeTimeFormat(lang === "ar" ? "ar" : "en", { numeric: "auto" });
  if (s < 60) return rtf.format(-s, "second");
  if (s < 3600) return rtf.format(-Math.round(s / 60), "minute");
  if (s < 86400) return rtf.format(-Math.round(s / 3600), "hour");
  return rtf.format(-Math.round(s / 86400), "day");
}
