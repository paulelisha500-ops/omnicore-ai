/* ============================================================================
   Integrations that genuinely work from a static web app — no OAuth app,
   no server, no stored vendor secrets beyond the webhook URL you paste in.

   Delivery notes, stated plainly because the browser enforces them:
   • Discord webhooks and CORS-enabled webhook receivers return a readable
     response, so delivery is confirmed.
   • Slack incoming webhooks don't answer browser CORS preflights, so they're
     sent as a "simple" form request. Slack receives it, but the browser is
     not allowed to read Slack's reply — the status shows "sent" rather than
     "confirmed".
   • Email opens your own mail app with the message filled in (mailto:).
   ============================================================================ */
import { db, uid } from "./db.js";
import { logEvent } from "./data.js";

export const TYPES = {
  slack: {
    en: "Slack", ar: "Slack", cat: "Messaging",
    enD: "Post messages to a channel through an incoming webhook.",
    arD: "انشر رسائل في قناة عبر Webhook وارد.",
    field: { key: "url", en: "Incoming webhook URL", ar: "رابط Webhook الوارد", placeholder: "https://hooks.slack.com/services/…" },
    help: "Slack → Apps → Incoming Webhooks → Add to a channel → copy the URL.",
    validate: (v) => /^https:\/\/hooks\.slack\.com\/(services|workflows|triggers)\//.test(v),
  },
  discord: {
    en: "Discord", ar: "Discord", cat: "Messaging",
    enD: "Post to a Discord channel through a channel webhook.",
    arD: "انشر في قناة Discord عبر Webhook القناة.",
    field: { key: "url", en: "Channel webhook URL", ar: "رابط Webhook القناة", placeholder: "https://discord.com/api/webhooks/…" },
    help: "Discord → Channel settings → Integrations → Webhooks → New webhook → Copy URL.",
    validate: (v) => /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(v),
  },
  webhook: {
    en: "Custom webhook", ar: "Webhook مخصص", cat: "API",
    enD: "POST a JSON event to any HTTPS endpoint you control (Zapier, Make, n8n, your own API).",
    arD: "أرسل حدثًا بصيغة JSON إلى أي عنوان HTTPS تتحكم فيه (Zapier أو Make أو n8n أو واجهتك).",
    field: { key: "url", en: "Endpoint URL", ar: "رابط نقطة النهاية", placeholder: "https://…" },
    help: "Any HTTPS URL. If it allows CORS, OmniCore shows the HTTP status it returned.",
    validate: (v) => /^https:\/\/[^\s]+$/.test(v),
  },
  email: {
    en: "Email", ar: "البريد الإلكتروني", cat: "Email",
    enD: "Open a pre-filled email to a recipient in your own mail app.",
    arD: "افتح رسالة بريد معبأة مسبقًا لمستلم في تطبيق بريدك.",
    field: { key: "to", en: "Recipient email", ar: "بريد المستلم", placeholder: "team@company.com" },
    help: "Uses your device's mail app — nothing is sent until you press Send there.",
    validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    interactiveOnly: true,
  },
  browser: {
    en: "Desktop notifications", ar: "إشعارات سطح المكتب", cat: "System",
    enD: "Show a system notification on this device when an automation runs.",
    arD: "اعرض إشعار نظام على هذا الجهاز عند تشغيل أتمتة.",
    field: null,
    help: "Your browser will ask for permission once.",
  },
};

export async function connect(owner, type, value = "") {
  const def = TYPES[type];
  if (!def) throw new Error("Unknown integration.");
  const v = String(value).trim();
  if (def.field && !def.validate(v)) {
    const e = new Error(`That doesn't look like a valid ${def.field.en.toLowerCase()}.`);
    e.ar = `هذا لا يبدو ${def.field.ar} صالحًا.`;
    throw e;
  }
  if (type === "browser") {
    if (!("Notification" in window)) throw new Error("This browser doesn't support notifications.");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      const e = new Error("Notification permission was not granted. You can allow it from the site settings in your browser.");
      e.ar = "لم يُمنح إذن الإشعارات. يمكنك السماح به من إعدادات الموقع في متصفحك.";
      throw e;
    }
  }
  const row = { id: uid(), owner, type, target: v, createdAt: Date.now(), lastStatus: null, lastAt: null, sent: 0 };
  await db.put("integrations", row);
  await logEvent(owner, "integrations", "connected", def.en);
  return row;
}

export async function disconnect(row) {
  await db.delete("integrations", row.id);
  await logEvent(row.owner, "integrations", "disconnected", TYPES[row.type]?.en || row.type);
}

export function describe(row) {
  const t = TYPES[row.type];
  if (!row.target) return t?.en || row.type;
  if (row.type === "email") return row.target;
  try { const u = new URL(row.target); return `${u.host}${u.pathname.slice(0, 18)}…`; } catch { return row.target; }
}

/**
 * Deliver a message. Returns { ok: true|null|false, note }:
 *   true  → the receiver confirmed; null → sent, unconfirmable; false → failed.
 */
export async function deliver(row, { title, text, data = {} }, { interactive = false } = {}) {
  let result;
  try {
    if (row.type === "slack") {
      await fetch(row.target, {
        method: "POST", mode: "no-cors",
        body: new URLSearchParams({ payload: JSON.stringify({ text: `*${title}*\n${text}` }) }),
      });
      result = { ok: null, note: "Sent to Slack" };
    } else if (row.type === "discord") {
      const r = await fetch(row.target, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `**${title}**\n${text}`.slice(0, 1990) }),
      });
      result = r.ok ? { ok: true, note: `Discord accepted (${r.status})` } : { ok: false, note: `Discord returned ${r.status}` };
    } else if (row.type === "webhook") {
      const payload = JSON.stringify({ source: "omnicore-ai", title, text, data, sentAt: new Date().toISOString() });
      try {
        const r = await fetch(row.target, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload });
        result = r.ok ? { ok: true, note: `HTTP ${r.status}` } : { ok: false, note: `HTTP ${r.status}` };
      } catch {
        // Receiver doesn't allow CORS: resend as a simple request it can still accept.
        await fetch(row.target, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body: payload });
        result = { ok: null, note: "Sent (receiver doesn't allow the browser to read its reply)" };
      }
    } else if (row.type === "email") {
      if (!interactive) {
        result = { ok: false, note: "Email opens your mail app, so it only runs when you click Run or Send test" };
      } else {
        const href = `mailto:${encodeURIComponent(row.target)}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`;
        window.location.href = href;
        result = { ok: null, note: "Opened your mail app" };
      }
    } else if (row.type === "browser") {
      if (Notification.permission !== "granted") {
        result = { ok: false, note: "Notification permission is off for this site" };
      } else {
        new Notification(title, { body: text.slice(0, 240), tag: `omnicore-${Date.now()}` });
        result = { ok: true, note: "Notification shown" };
      }
    } else {
      result = { ok: false, note: "Unknown integration" };
    }
  } catch (e) {
    result = { ok: false, note: e?.message || "Network error" };
  }
  await db.put("integrations", { ...row, lastStatus: result, lastAt: Date.now(), sent: (row.sent || 0) + (result.ok === false ? 0 : 1) });
  return result;
}
