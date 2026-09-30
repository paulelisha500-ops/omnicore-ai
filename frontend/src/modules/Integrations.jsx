import React, { useState } from "react";
import { MessageSquare, Hash, Webhook, Mail, BellRing, Plus, Send, Unplug, CheckCircle2, AlertTriangle, CircleDashed, Info, PlugZap } from "lucide-react";
import { Card, CardTitle, SectionHeader, ModuleShell, Button, Badge, Sheet, Field, Notice, EmptyState, toast } from "../ui.jsx";
import { useOwned, errText, timeAgo } from "../lib/data.js";
import { TYPES, connect, disconnect, deliver, describe } from "../lib/integrations.js";

const ICONS = { slack: Hash, discord: MessageSquare, webhook: Webhook, email: Mail, browser: BellRing };

const T = {
  en: {
    eyebrow: "Module 12", title: "Integration Hub",
    desc: "Send OmniCore's results to the tools your team already uses. Every connector here works straight from the browser — paste a webhook URL and it's live.",
    catalog: "Available connectors", connected: "Connected", none: "Nothing connected yet", noneBody: "Connect Slack, Discord, a webhook, email or desktop notifications, then use it in an automation.",
    connect: "Connect", addAnother: "Add another", test: "Send test", disconnect: "Disconnect", sent: "sent", how: "How to get it",
    testTitle: "Test from OmniCore AI", testBody: "If you can read this, the integration works.",
    semantics: "Delivery status", semanticsBody: "Discord and CORS-enabled webhooks confirm delivery. Slack accepts messages from browsers but won't let the browser read its reply, so Slack shows \"sent\". Email opens your mail app.",
    connectedToast: "Connected", removed: "Disconnected",
  },
  ar: {
    eyebrow: "الوحدة 12", title: "مركز التكاملات",
    desc: "أرسل نتائج أومنيكور إلى الأدوات التي يستخدمها فريقك بالفعل. كل موصل هنا يعمل مباشرة من المتصفح — الصق رابط Webhook ويصبح فعّالًا.",
    catalog: "الموصلات المتاحة", connected: "المربوطة", none: "لا شيء مربوط بعد", noneBody: "اربط Slack أو Discord أو Webhook أو البريد أو إشعارات سطح المكتب، ثم استخدمه في أتمتة.",
    connect: "ربط", addAnother: "إضافة آخر", test: "إرسال تجربة", disconnect: "قطع الربط", sent: "مُرسَلة", how: "كيف تحصل عليه",
    testTitle: "تجربة من أومنيكور", testBody: "إن كنت تقرأ هذا فالتكامل يعمل.",
    semantics: "حالة التسليم", semanticsBody: "Discord وWebhooks التي تسمح بـ CORS تؤكد التسليم. يقبل Slack الرسائل من المتصفحات لكنه لا يسمح للمتصفح بقراءة رده، لذا تظهر حالته «مُرسَلة». البريد يفتح تطبيق بريدك.",
    connectedToast: "تم الربط", removed: "تم قطع الربط",
  },
};

export default function Integrations({ lang, user }) {
  const t = T[lang];
  const [rows] = useOwned("integrations", user.username);
  const [adding, setAdding] = useState(null);
  const [busy, setBusy] = useState(null);

  const test = async (row) => {
    setBusy(row.id);
    const r = await deliver(row, { title: t.testTitle, text: t.testBody }, { interactive: true });
    setBusy(null);
    toast(r.note, { tone: r.ok === false ? "danger" : "success" });
  };

  const status = (row) => {
    if (!row.lastStatus) return <Badge icon={CircleDashed}>{lang === "ar" ? "لم يُختبر" : "Not tested"}</Badge>;
    const ok = row.lastStatus.ok;
    return <Badge tone={ok === false ? "danger" : "success"} icon={ok === false ? AlertTriangle : CheckCircle2}>{row.lastStatus.note.slice(0, 44)}</Badge>;
  };

  return (
    <ModuleShell>
      <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc} />
      <CardTitle>{t.connected}</CardTitle>
      {rows.length === 0 ? <Card style={{ marginBottom: 18 }}><EmptyState icon={PlugZap} title={t.none} body={t.noneBody} /></Card> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          {rows.map((row) => {
            const I = ICONS[row.type];
            return (
              <Card key={row.id} padded={false} className="oc-fade-up">
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", flexWrap: "wrap" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}><I size={18} color="var(--accent)" /></div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5 }}>{TYPES[row.type][lang]}</div>
                    <div className="oc-mono" style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 2 }} dir="ltr">{describe(row)}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    {status(row)}
                    <span style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{row.sent || 0} {t.sent}{row.lastAt ? ` · ${timeAgo(row.lastAt, lang)}` : ""}</span>
                  </div>
                  <Button size="sm" variant="ghost" icon={Send} loading={busy === row.id} onClick={() => test(row)}>{t.test}</Button>
                  <Button size="sm" variant="danger" icon={Unplug} onClick={async () => { await disconnect(row); toast(t.removed); }}>{t.disconnect}</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CardTitle>{t.catalog}</CardTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
        {Object.entries(TYPES).map(([key, def]) => {
          const I = ICONS[key];
          const count = rows.filter((r) => r.type === key).length;
          return (
            <Card key={key} lift style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--surface-sunken)", display: "flex", alignItems: "center", justifyContent: "center" }}><I size={19} color="var(--ink-soft)" /></div>
                {count > 0 ? <Badge tone="success" icon={CheckCircle2}>{count}</Badge> : <Badge>{def.cat}</Badge>}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginTop: 12 }}>{def[lang]}</div>
              <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4, lineHeight: 1.5, flex: 1 }}>{lang === "ar" ? def.arD : def.enD}</div>
              <div style={{ marginTop: 14 }}>
                <Button size="sm" variant={count ? "ghost" : "primary"} icon={Plus} onClick={() => setAdding(key)} disabled={key === "browser" && count > 0}>{count ? t.addAnother : t.connect}</Button>
              </div>
            </Card>
          );
        })}
      </div>
      <Notice icon={Info} style={{ marginTop: 16 }}><strong>{t.semantics}.</strong> {t.semanticsBody}</Notice>

      {adding && <ConnectSheet t={t} lang={lang} user={user} type={adding} onClose={() => setAdding(null)} />}
    </ModuleShell>
  );
}

function ConnectSheet({ t, lang, user, type, onClose }) {
  const def = TYPES[type];
  const [value, setValue] = useState("");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setErr(null);
    try { await connect(user.username, type, value); toast(t.connectedToast); onClose(); }
    catch (e) { setErr(errText(e, lang)); }
    finally { setBusy(false); }
  };
  return (
    <Sheet open onClose={onClose} title={`${t.connect} ${def[lang]}`}
      footer={<><Button variant="ghost" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button><Button variant="accent" onClick={submit} loading={busy} disabled={def.field && !value.trim()}>{t.connect}</Button></>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55 }}>{lang === "ar" ? def.arD : def.enD}</div>
        {def.field && (
          <Field label={def.field[lang]}>
            <input value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder={def.field.placeholder} className="oc-input" dir="ltr" autoComplete="off" spellCheck={false} />
          </Field>
        )}
        <Notice icon={Info}><strong>{t.how}:</strong> {def.help}</Notice>
        {err && <Notice tone="danger">{err}</Notice>}
      </div>
    </Sheet>
  );
}
