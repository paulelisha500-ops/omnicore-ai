import React, { useMemo, useState } from "react";
import { Plus, Play, Trash2, Pencil, Sparkles, Workflow, Zap, ArrowRight, CheckCircle2, AlertTriangle, CircleDashed, History, PlugZap } from "lucide-react";
import { Card, CardTitle, SectionHeader, ModuleShell, Button, Badge, Switch, Sheet, Field, Notice, EmptyState, IconButton, toast } from "../ui.jsx";
import { useOwned, errText, timeAgo } from "../lib/data.js";
import { TRIGGERS, ACTIONS, SCHEDULES, createRule, updateRule, deleteRule, runRule, refreshSchedules, triggerLabel, actionLabel } from "../lib/automation.js";
import { TYPES as INTEG, describe } from "../lib/integrations.js";
import { generateJSON } from "../lib/ai.js";
import { commonText } from "../i18n.js";

const T = {
  en: {
    eyebrow: "Module 09", title: "Automation Platform",
    desc: "When something happens in OmniCore, do something about it — notify you, post to Slack or Discord, call a webhook, or file it in the knowledge base. Rules run automatically while OmniCore is open.",
    new: "New automation", edit: "Edit automation", name: "Name", trigger: "When", action: "Then", every: "Every", minutes: "minutes",
    integration: "Send to", noInteg: "No integrations connected yet.", connect: "Connect one", message: "Message (optional)", messagePh: "Added to every notification this rule sends",
    save: "Save", create: "Create", describe: "Describe it in plain words", describePh: "e.g. When a customer looks likely to churn, post it to Slack",
    draft: "Draft with AI", drafted: "Drafted — check the fields below.", runNow: "Run now", runs: "runs", never: "Never run", last: "Last run",
    empty: "No automations yet", emptyBody: "Create your first rule — or turn on a suggested one in the Recommendation Engine.",
    log: "Run log", noLog: "Runs will be listed here.", deleted: "Automation deleted", created: "Automation created", updated: "Saved",
    confirmDel: "Delete this automation?", on: "On", off: "Off",
  },
  ar: {
    eyebrow: "الوحدة 09", title: "منصة الأتمتة",
    desc: "عندما يحدث شيء في أومنيكور، افعل شيئًا حياله — أشعرك، أو انشر في Slack أو Discord، أو استدعِ Webhook، أو احفظه في قاعدة المعرفة. تعمل القواعد تلقائيًا أثناء فتح أومنيكور.",
    new: "أتمتة جديدة", edit: "تعديل الأتمتة", name: "الاسم", trigger: "عندما", action: "ثم", every: "كل", minutes: "دقيقة",
    integration: "أرسل إلى", noInteg: "لا توجد تكاملات مربوطة بعد.", connect: "اربط واحدًا", message: "رسالة (اختيارية)", messagePh: "تُضاف إلى كل إشعار ترسله هذه القاعدة",
    save: "حفظ", create: "إنشاء", describe: "صِفها بكلمات بسيطة", describePh: "مثال: عندما يبدو أن عميلًا سيتسرّب، انشر ذلك في Slack",
    draft: "صياغة بالذكاء الاصطناعي", drafted: "تمت الصياغة — راجع الحقول أدناه.", runNow: "تشغيل الآن", runs: "تشغيلات", never: "لم يُشغَّل", last: "آخر تشغيل",
    empty: "لا توجد أتمتة بعد", emptyBody: "أنشئ قاعدتك الأولى — أو فعّل واحدة مقترحة في محرك التوصيات.",
    log: "سجل التشغيل", noLog: "ستُدرج التشغيلات هنا.", deleted: "تم حذف الأتمتة", created: "تم إنشاء الأتمتة", updated: "تم الحفظ",
    confirmDel: "حذف هذه الأتمتة؟", on: "تعمل", off: "متوقفة",
  },
};

const blank = { name: "", trigger: "document.analyzed", action: "notify", integrationId: "", minutes: 60, message: "" };

export default function Automation({ lang, user, go }) {
  const t = T[lang];
  const [rules] = useOwned("automations", user.username, { sort: (a, b) => b.createdAt - a.createdAt });
  const [integrations] = useOwned("integrations", user.username);
  const [events] = useOwned("events", user.username, { filter: (e) => e.module === "automation" && e.action === "run", sort: (a, b) => b.at - a.at });
  const [editing, setEditing] = useState(null); // null | "new" | rule
  const [confirm, setConfirm] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const toggle = async (r) => { await updateRule(r, { enabled: !r.enabled }); refreshSchedules(); };
  const runNow = async (r) => {
    setBusyId(r.id);
    try {
      const res = await runRule(r, { module: "manual", action: "manual", detail: lang === "ar" ? "تشغيل يدوي" : "Manual run", at: Date.now() }, { interactive: true });
      toast(res.note, { tone: res.ok === false ? "danger" : "success" });
    } finally { setBusyId(null); }
  };

  const resultBadge = (r) => {
    if (!r.lastResult) return <Badge icon={CircleDashed}>{t.never}</Badge>;
    const ok = r.lastResult.ok;
    return <Badge tone={ok === false ? "danger" : "success"} icon={ok === false ? AlertTriangle : CheckCircle2}>{r.lastResult.note.slice(0, 48)}</Badge>;
  };

  return (
    <ModuleShell>
      <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc} action={<Button variant="accent" icon={Plus} onClick={() => setEditing("new")}>{t.new}</Button>} />
      {rules.length === 0 ? (
        <Card><EmptyState icon={Workflow} title={t.empty} body={t.emptyBody} action={<Button icon={Plus} onClick={() => setEditing("new")}>{t.new}</Button>} /></Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rules.map((r) => {
            const integ = integrations.find((i) => i.id === r.integrationId);
            return (
              <Card key={r.id} padded={false} className="oc-fade-up" style={{ opacity: r.enabled ? 1 : 0.72, transition: "opacity .25s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", flexWrap: "wrap" }}>
                  <Switch checked={r.enabled} onChange={() => toggle(r)} label={r.enabled ? t.on : t.off} />
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5 }}>{r.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--ink-soft)", marginTop: 4, flexWrap: "wrap" }}>
                      <Badge tone="accent" icon={Zap}>{r.trigger === "schedule" ? `${t.every} ${r.minutes} ${t.minutes}` : triggerLabel(r.trigger, lang)}</Badge>
                      <ArrowRight size={13} className="oc-flip" />
                      <Badge tone="spark">{r.action === "integration" ? `${INTEG[integ?.type]?.[lang] || "?"}${integ ? ` · ${describe(integ)}` : ""}` : actionLabel(r.action, lang)}</Badge>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    {resultBadge(r)}
                    <span className="oc-mono" style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{r.runs} {t.runs}{r.lastRunAt ? ` · ${timeAgo(r.lastRunAt, lang)}` : ""}</span>
                  </div>
                  <div style={{ display: "flex", gap: 2 }}>
                    <IconButton icon={Play} title={t.runNow} onClick={() => runNow(r)} disabled={busyId === r.id} />
                    <IconButton icon={Pencil} title={t.edit} onClick={() => setEditing(r)} />
                    <IconButton icon={Trash2} title={commonText[lang].delete} onClick={() => setConfirm(r)} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card style={{ marginTop: 14 }}>
        <CardTitle>{t.log}</CardTitle>
        {events.length === 0 ? <EmptyState icon={History} body={t.noLog} /> : (
          <div>
            {events.slice(0, 20).map((e) => (
              <div key={e.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                {e.data?.ok === false ? <AlertTriangle size={14} color="var(--danger)" /> : <CheckCircle2 size={14} color="var(--success)" />}
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.detail}</span>
                <span style={{ fontSize: 11.5, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>{timeAgo(e.at, lang)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {editing && <RuleSheet t={t} lang={lang} user={user} rule={editing === "new" ? null : editing} integrations={integrations} onClose={() => setEditing(null)} go={go} />}
      <Sheet open={Boolean(confirm)} onClose={() => setConfirm(null)} title={t.confirmDel}
        footer={<>
          <Button variant="ghost" onClick={() => setConfirm(null)}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
          <Button variant="danger" icon={Trash2} onClick={async () => { await deleteRule(confirm); refreshSchedules(); setConfirm(null); toast(t.deleted); }}>{lang === "ar" ? "حذف" : "Delete"}</Button>
        </>}>
        <div style={{ fontSize: 14, color: "var(--ink-soft)" }}>{confirm?.name}</div>
      </Sheet>
    </ModuleShell>
  );
}

function RuleSheet({ t, lang, user, rule, integrations, onClose, go }) {
  const [form, setForm] = useState(rule ? { ...blank, ...rule, integrationId: rule.integrationId || "" } : { ...blank, integrationId: integrations[0]?.id || "" });
  const [desc, setDesc] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [note, setNote] = useState(null);
  const [err, setErr] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const draft = async () => {
    if (!desc.trim()) return;
    setDrafting(true); setErr(null); setNote(null);
    const triggerList = TRIGGERS.map((x) => `${x.key}: ${x.en}`).join("\n");
    const actionList = ACTIONS.map((x) => `${x.key}: ${x.en}`).join("\n");
    const integList = integrations.map((i) => `${i.id}: ${INTEG[i.type]?.en}`).join("\n") || "none";
    try {
      const j = await generateJSON({
        system: "You convert an automation description into JSON. Reply with JSON only.",
        prompt: `Pick the best trigger and action keys from these lists.\nTRIGGERS:\n${triggerList}\nACTIONS:\n${actionList}\nCONNECTED INTEGRATIONS (id: type):\n${integList}\n\nReturn JSON: {"name": short name, "trigger": trigger key, "action": action key, "integrationId": id or "", "minutes": number (only for schedule), "message": short message}\n\nDESCRIPTION: ${desc}`,
        maxTokens: 160,
      }, () => ({}));
      const next = { ...form };
      if (TRIGGERS.some((x) => x.key === j.trigger)) next.trigger = j.trigger;
      if (ACTIONS.some((x) => x.key === j.action)) next.action = j.action;
      if (/slack|discord|webhook|email|mail|post|send/i.test(desc) && integrations.length && next.action !== "integration") next.action = "integration";
      if (integrations.some((i) => i.id === j.integrationId)) next.integrationId = j.integrationId;
      else if (next.action === "integration") {
        const want = ["slack", "discord", "email", "webhook", "browser"].find((k) => desc.toLowerCase().includes(k === "browser" ? "desktop" : k));
        next.integrationId = (integrations.find((i) => i.type === want) || integrations[0])?.id || "";
      }
      if (j.minutes && SCHEDULES.includes(Number(j.minutes))) next.minutes = Number(j.minutes);
      next.name = (typeof j.name === "string" && j.name.trim()) ? j.name.trim().slice(0, 120) : desc.slice(0, 80);
      if (typeof j.message === "string") next.message = j.message.slice(0, 300);
      setForm(next); setNote(t.drafted);
    } catch (e) { setErr(errText(e, lang)); }
    finally { setDrafting(false); }
  };

  const save = async () => {
    setSaving(true); setErr(null);
    try {
      const payload = { ...form, integrationId: form.action === "integration" ? form.integrationId || null : null, minutes: Number(form.minutes) };
      if (rule) { await updateRule(rule, payload); toast(t.updated); }
      else { await createRule(user.username, payload); toast(t.created); }
      refreshSchedules(); onClose();
    } catch (e) { setErr(errText(e, lang)); }
    finally { setSaving(false); }
  };

  return (
    <Sheet open onClose={onClose} title={rule ? t.edit : t.new} width={600}
      footer={<><Button variant="ghost" onClick={onClose}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button><Button variant="accent" onClick={save} loading={saving}>{rule ? t.save : t.create}</Button></>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {!rule && (
          <div style={{ background: "var(--spark-soft)", borderRadius: 14, padding: 12 }}>
            <Field label={t.describe}>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={desc} onChange={(e) => setDesc(e.target.value)} onKeyDown={(e) => e.key === "Enter" && draft()} placeholder={t.describePh} className="oc-input" />
                <Button icon={Sparkles} onClick={draft} loading={drafting} disabled={!desc.trim()}>{t.draft}</Button>
              </div>
            </Field>
            {note && <div style={{ fontSize: 12.5, color: "var(--spark)", marginTop: 8, fontWeight: 650 }}>{note}</div>}
          </div>
        )}
        <Field label={t.name}><input value={form.name} onChange={set("name")} className="oc-input" placeholder={triggerLabel(form.trigger, lang)} /></Field>
        <Field label={t.trigger}>
          <select value={form.trigger} onChange={set("trigger")} className="oc-input">{TRIGGERS.map((x) => <option key={x.key} value={x.key}>{x[lang]}</option>)}</select>
        </Field>
        {form.trigger === "schedule" && (
          <Field label={`${t.every} (${t.minutes})`}>
            <select value={form.minutes} onChange={set("minutes")} className="oc-input">{SCHEDULES.map((m) => <option key={m} value={m}>{m}</option>)}</select>
          </Field>
        )}
        <Field label={t.action}>
          <select value={form.action} onChange={set("action")} className="oc-input">{ACTIONS.map((x) => <option key={x.key} value={x.key}>{x[lang]}</option>)}</select>
        </Field>
        {form.action === "integration" && (integrations.length === 0
          ? <Notice icon={PlugZap}>{t.noInteg} <Button size="sm" variant="link" onClick={() => { onClose(); go("plugins"); }}>{t.connect}</Button></Notice>
          : <Field label={t.integration}>
              <select value={form.integrationId} onChange={set("integrationId")} className="oc-input">
                {integrations.map((i) => <option key={i.id} value={i.id}>{INTEG[i.type]?.[lang]} · {describe(i)}</option>)}
              </select>
            </Field>)}
        <Field label={t.message}><input value={form.message} onChange={set("message")} className="oc-input" placeholder={t.messagePh} /></Field>
        {err && <Notice tone="danger">{err}</Notice>}
      </div>
    </Sheet>
  );
}
