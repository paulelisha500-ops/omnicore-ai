/* ============================================================================
   Automation engine.

   Rules pair a trigger (something that happens in OmniCore) with an action
   (notify, deliver through an integration, or save to the knowledge base).
   The engine listens on the app event bus while the app is open, runs every
   matching enabled rule for the signed-in user, and records each run — its
   time, result and delivery status — on the rule itself.
   ============================================================================ */
import { db, uid } from "./db.js";
import { on } from "./bus.js";
import { addDoc, logEvent, notify } from "./data.js";
import { deliver, TYPES as INTEGRATION_TYPES } from "./integrations.js";

export const TRIGGERS = [
  { key: "document.analyzed", en: "A document is analyzed", ar: "تحليل مستند" },
  { key: "image.analyzed", en: "An image is analyzed", ar: "تحليل صورة" },
  { key: "chat.message", en: "The assistant answers a chat", ar: "رد المساعد في الدردشة" },
  { key: "prediction.high_risk", en: "A churn prediction is high-risk", ar: "تنبؤ تسرّب عالي الخطورة" },
  { key: "batch.scored", en: "A customer file is scored", ar: "تقييم ملف عملاء" },
  { key: "transcript.summarized", en: "A meeting is summarized", ar: "تلخيص اجتماع" },
  { key: "agent.completed", en: "An agent finishes a run", ar: "انتهاء تشغيل وكيل" },
  { key: "trade.searched", en: "A regulatory search runs", ar: "تشغيل بحث تنظيمي" },
  { key: "kb.added", en: "A knowledge document is added", ar: "إضافة مستند معرفي" },
  { key: "schedule", en: "On a schedule (while OmniCore is open)", ar: "وفق جدول (أثناء فتح أومنيكور)" },
  { key: "manual", en: "Only when I press Run", ar: "فقط عند الضغط على تشغيل" },
];

export const ACTIONS = [
  { key: "notify", en: "Notify me in OmniCore", ar: "أشعرني داخل أومنيكور" },
  { key: "integration", en: "Send through an integration", ar: "أرسل عبر تكامل" },
  { key: "kb.save", en: "Save the event to the knowledge base", ar: "احفظ الحدث في قاعدة المعرفة" },
];

export const SCHEDULES = [5, 15, 60, 240, 1440];

export const triggerLabel = (key, lang) => TRIGGERS.find((t) => t.key === key)?.[lang] || key;
export const actionLabel = (key, lang) => ACTIONS.find((a) => a.key === key)?.[lang] || key;

export async function createRule(owner, { name, trigger, action, integrationId = null, minutes = 60, message = "" }) {
  const rule = {
    id: uid(), owner, name: String(name || "").trim().slice(0, 140) || triggerLabel(trigger, "en"),
    trigger, action, integrationId, minutes: Number(minutes) || 60, message: String(message).slice(0, 400),
    enabled: true, runs: 0, lastRunAt: null, lastResult: null, createdAt: Date.now(), updatedAt: Date.now(),
  };
  validate(rule);
  await db.put("automations", rule);
  await logEvent(owner, "automation", "created", rule.name);
  return rule;
}

function validate(rule) {
  if (!TRIGGERS.some((t) => t.key === rule.trigger)) throw new Error("Pick a trigger.");
  if (!ACTIONS.some((a) => a.key === rule.action)) throw new Error("Pick an action.");
  if (rule.action === "integration" && !rule.integrationId) {
    const e = new Error("Choose which integration to send to — connect one in the Integration Hub first.");
    e.ar = "اختر التكامل الذي سيُرسَل إليه — اربط واحدًا أولًا في مركز التكاملات.";
    throw e;
  }
}

export async function updateRule(rule, patch) {
  const next = { ...rule, ...patch, updatedAt: Date.now() };
  validate(next);
  await db.put("automations", next);
  return next;
}

export async function deleteRule(rule) {
  await db.delete("automations", rule.id);
  await logEvent(rule.owner, "automation", "deleted", rule.name);
}

/** Execute one rule. `event` is the app event that fired it (or a manual stub). */
export async function runRule(rule, event, { interactive = false } = {}) {
  const title = `${rule.name}`;
  const lines = [
    rule.message,
    event?.detail ? `${event.detail}` : "",
    event?.module ? `Module: ${event.module}` : "",
  ].filter(Boolean);
  const text = lines.join("\n") || "Automation ran.";
  let result;
  try {
    if (rule.action === "notify") {
      await notify(rule.owner, { title, body: text, kind: "automation", module: "automation" });
      result = { ok: true, note: "Notification added" };
    } else if (rule.action === "kb.save") {
      await addDoc(rule.owner, { title: `${rule.name} — ${new Date().toLocaleString()}`, content: text, source: "automation" });
      result = { ok: true, note: "Saved to knowledge base" };
    } else if (rule.action === "integration") {
      const integ = await db.get("integrations", rule.integrationId);
      if (!integ) result = { ok: false, note: "The linked integration was disconnected" };
      else {
        result = await deliver(integ, { title, text, data: { trigger: rule.trigger, event: event ? { module: event.module, action: event.action, detail: event.detail, at: event.at } : null } }, { interactive });
        result.note = `${INTEGRATION_TYPES[integ.type]?.en || integ.type}: ${result.note}`;
      }
    }
  } catch (e) {
    result = { ok: false, note: e?.message || "Failed" };
  }
  const fresh = (await db.get("automations", rule.id)) || rule;
  await db.put("automations", { ...fresh, runs: (fresh.runs || 0) + 1, lastRunAt: Date.now(), lastResult: result });
  await logEvent(rule.owner, "automation", "run", `${rule.name} → ${result.note}`, { ruleId: rule.id, ok: result.ok });
  if (result.ok === false && rule.action !== "notify") {
    await notify(rule.owner, { title: `Automation failed: ${rule.name}`, body: result.note, kind: "error", module: "automation" });
  }
  return result;
}

/* ---------------------------------------------------------------------------
   Engine lifecycle — started once per signed-in session by the app shell.
   --------------------------------------------------------------------------- */
export function startEngine(owner) {
  const timers = new Map();

  const offEvents = on("app-event", async (ev) => {
    if (!ev || ev.owner !== owner || ev.module === "automation") return; // never let runs trigger runs
    const rules = (await db.byOwner("automations", owner)).filter((r) => r.enabled && r.trigger === ev.action);
    for (const r of rules) runRule(r, ev).catch((e) => console.error("[automation]", e));
  });

  async function syncSchedules() {
    const rules = (await db.byOwner("automations", owner)).filter((r) => r.enabled && r.trigger === "schedule");
    const want = new Map(rules.map((r) => [r.id, r]));
    for (const [id, h] of timers) {
      if (!want.has(id) || want.get(id).minutes !== h.minutes) { clearInterval(h.t); timers.delete(id); }
    }
    for (const r of rules) {
      if (timers.has(r.id)) continue;
      const ms = Math.max(1, r.minutes) * 60_000;
      const t = setInterval(async () => {
        const cur = await db.get("automations", r.id);
        if (cur?.enabled) runRule(cur, { module: "schedule", action: "schedule", detail: `Scheduled every ${cur.minutes} min`, at: Date.now() });
      }, ms);
      timers.set(r.id, { t, minutes: r.minutes });
    }
  }
  syncSchedules();
  const poll = setInterval(syncSchedules, 30_000);
  const onChange = () => syncSchedules();
  window.addEventListener("omnicore:automations-changed", onChange);

  return () => {
    offEvents();
    clearInterval(poll);
    window.removeEventListener("omnicore:automations-changed", onChange);
    for (const h of timers.values()) clearInterval(h.t);
    timers.clear();
  };
}

export const refreshSchedules = () => window.dispatchEvent(new Event("omnicore:automations-changed"));
