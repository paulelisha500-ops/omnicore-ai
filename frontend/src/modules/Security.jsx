import React, { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Users, ScrollText, Download, Trash2, KeyRound, Lock, HardDrive, Cpu, Timer, UserX, Search, Globe } from "lucide-react";
import { Card, CardTitle, SectionHeader, ModuleShell, Button, Badge, Sheet, Notice, EmptyState, Segmented, toast } from "../ui.jsx";
import { useOwned, clearEvents, download, errText, timeAgo } from "../lib/data.js";
import { listUsers, setRole, removeUser, requireAdmin, ROLES, ADMIN, PASSWORD_POLICY, LOCKOUT, SESSION_HOURS } from "../lib/auth.js";
import { storageEstimate, onDbChange } from "../lib/db.js";
import { toCSV } from "../lib/churn.js";
import { fmtBytes } from "../lib/ai.js";

const T = {
  en: {
    eyebrow: "Module 11", title: "Security & Governance",
    desc: "Manage who can use this workspace and review everything that happened in it. These controls are enforced by OmniCore's data layer, not just hidden in the interface.",
    tabs: { users: "Users & roles", audit: "Audit log", controls: "Controls" },
    you: "you", created: "Joined", remove: "Remove", confirmRemove: "Remove this user and all of their data?", removed: "User removed", roleSaved: "Role updated",
    filterUser: "All users", filterModule: "All modules", searchPh: "Filter audit log…", export: "Export CSV", clear: "Clear log", confirmClear: "Permanently clear the entire audit log?",
    cleared: "Audit log cleared", empty: "No events match.", events: "events",
    controls: [
      [KeyRound, "Password storage", `PBKDF2-SHA-256, ${PASSWORD_POLICY.iterations.toLocaleString("en-US")} iterations, per-user random salt. Passwords are never stored.`],
      [Lock, "Brute-force protection", `${LOCKOUT.maxFailures} failed sign-ins lock an account for ${LOCKOUT.minutes} minutes.`],
      [Timer, "Session lifetime", `Sessions expire after ${SESSION_HOURS} hours.`],
      [ShieldCheck, "Role enforcement", "Admin operations re-check the actor's role in the database before running."],
      [Cpu, "AI data handling", "Models run on this device. Prompts, documents, images and audio are never sent to an AI service."],
      [Globe, "Network egress", "Only opt-in lookups leave the device: Wikipedia / official-source searches (search text only) and integrations you connect."],
      [HardDrive, "Data residency", "All workspace data lives in this browser's IndexedDB. Users can export or delete their data from Settings."],
    ],
    storage: "Storage used on this device", persisted: "Protected from automatic eviction", notPersisted: "Browser may evict data under storage pressure",
  },
  ar: {
    eyebrow: "الوحدة 11", title: "الأمان والحوكمة",
    desc: "أدِر من يمكنه استخدام مساحة العمل هذه وراجع كل ما حدث فيها. تُطبَّق هذه الضوابط في طبقة بيانات أومنيكور، لا بمجرد إخفائها في الواجهة.",
    tabs: { users: "المستخدمون والأدوار", audit: "سجل التدقيق", controls: "الضوابط" },
    you: "أنت", created: "انضم", remove: "إزالة", confirmRemove: "إزالة هذا المستخدم وكل بياناته؟", removed: "تمت إزالة المستخدم", roleSaved: "تم تحديث الدور",
    filterUser: "كل المستخدمين", filterModule: "كل الوحدات", searchPh: "تصفية سجل التدقيق…", export: "تصدير CSV", clear: "مسح السجل", confirmClear: "مسح سجل التدقيق بالكامل نهائيًا؟",
    cleared: "تم مسح سجل التدقيق", empty: "لا أحداث مطابقة.", events: "حدثًا",
    controls: [
      [KeyRound, "تخزين كلمات المرور", `PBKDF2-SHA-256 بعدد ${PASSWORD_POLICY.iterations.toLocaleString("en-US")} دورة وملح عشوائي لكل مستخدم. لا تُخزَّن كلمات المرور أبدًا.`],
      [Lock, "الحماية من التخمين", `${LOCKOUT.maxFailures} محاولات فاشلة تقفل الحساب ${LOCKOUT.minutes} دقيقة.`],
      [Timer, "مدة الجلسة", `تنتهي الجلسات بعد ${SESSION_HOURS} ساعة.`],
      [ShieldCheck, "فرض الأدوار", "عمليات المسؤول تعيد التحقق من دور المنفّذ في قاعدة البيانات قبل التنفيذ."],
      [Cpu, "معالجة بيانات الذكاء الاصطناعي", "النماذج تعمل على هذا الجهاز. لا تُرسَل الرسائل أو المستندات أو الصور أو الصوت إلى أي خدمة ذكاء اصطناعي."],
      [Globe, "حركة الشبكة الخارجة", "لا يغادر الجهاز إلا ما تختاره: عمليات البحث في ويكيبيديا والمصادر الرسمية (نص البحث فقط) والتكاملات التي تربطها."],
      [HardDrive, "موقع البيانات", "كل بيانات مساحة العمل في IndexedDB بهذا المتصفح. يمكن للمستخدمين تصدير بياناتهم أو حذفها من الإعدادات."],
    ],
    storage: "المساحة المستخدمة على هذا الجهاز", persisted: "محمية من الحذف التلقائي", notPersisted: "قد يحذف المتصفح البيانات عند ضيق المساحة",
  },
};

export default function Security({ lang, user }) {
  const t = T[lang];
  const [tab, setTab] = useState("users");
  const [events] = useOwned("events", "*", { sort: (a, b) => b.at - a.at });
  return (
    <ModuleShell>
      <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc} action={<Badge tone="accent" icon={ShieldCheck}>{ADMIN}</Badge>} />
      <div style={{ marginBottom: 14 }}>
        <Segmented value={tab} onChange={setTab} options={[
          { value: "users", label: t.tabs.users, icon: Users },
          { value: "audit", label: t.tabs.audit, icon: ScrollText, count: events.length },
          { value: "controls", label: t.tabs.controls, icon: ShieldCheck },
        ]} />
      </div>
      {tab === "users" && <UsersTab t={t} lang={lang} user={user} />}
      {tab === "audit" && <AuditTab t={t} lang={lang} events={events} user={user} />}
      {tab === "controls" && <ControlsTab t={t} />}
    </ModuleShell>
  );
}

function UsersTab({ t, lang, user }) {
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const load = () => listUsers(user.username).then(setUsers).catch((e) => setErr(errText(e, lang)));
  useEffect(() => { load(); return onDbChange((s) => s === "users" && load()); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const change = async (u, role) => {
    setErr(null);
    try { await setRole(user.username, u.username, role); toast(t.roleSaved); } catch (e) { setErr(errText(e, lang)); }
  };

  return (
    <Card padded={false}>
      {err && <div style={{ padding: 14 }}><Notice tone="danger">{err}</Notice></div>}
      {users.map((u) => (
        <div key={u.username} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
          <div style={{ width: 38, height: 38, borderRadius: 99, background: u.role === ADMIN ? "linear-gradient(135deg, #0C8479, #2DD4BF)" : "var(--surface-sunken)", color: u.role === ADMIN ? "#fff" : "var(--ink-soft)",
            display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
            {u.full_name.split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{u.full_name} {u.username === user.username && <Badge tone="accent">{t.you}</Badge>}</div>
            <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>@{u.username} · {t.created} {timeAgo(u.createdAt, lang)}</div>
          </div>
          <select value={u.role} onChange={(e) => change(u, e.target.value)} className="oc-input" style={{ width: "auto", minWidth: 160, padding: "8px 12px" }}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <Button size="sm" variant="danger" icon={UserX} onClick={() => setConfirm(u)} disabled={u.username === user.username}>{t.remove}</Button>
        </div>
      ))}
      <Sheet open={Boolean(confirm)} onClose={() => setConfirm(null)} title={t.confirmRemove}
        footer={<>
          <Button variant="ghost" onClick={() => setConfirm(null)}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
          <Button variant="danger" icon={Trash2} onClick={async () => { try { await removeUser(user.username, confirm.username); toast(t.removed); } catch (e) { setErr(errText(e, lang)); } setConfirm(null); }}>{t.remove}</Button>
        </>}>
        <div style={{ fontSize: 14, color: "var(--ink-soft)" }}>{confirm?.full_name} (@{confirm?.username})</div>
      </Sheet>
    </Card>
  );
}

function AuditTab({ t, lang, events, user }) {
  const [who, setWho] = useState("");
  const [mod, setMod] = useState("");
  const [q, setQ] = useState("");
  const [confirm, setConfirm] = useState(false);
  const owners = useMemo(() => [...new Set(events.map((e) => e.owner))].sort(), [events]);
  const modules = useMemo(() => [...new Set(events.map((e) => e.module))].sort(), [events]);
  const shown = events.filter((e) => (!who || e.owner === who) && (!mod || e.module === mod) && (!q || `${e.action} ${e.detail}`.toLowerCase().includes(q.toLowerCase())));

  const exportCsv = () => download(`omnicore-audit-${new Date().toISOString().slice(0, 10)}.csv`,
    toCSV(shown.map((e) => ({ time: new Date(e.at).toISOString(), user: e.owner, module: e.module, action: e.action, detail: e.detail }))), "text/csv");

  return (
    <Card>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={14} color="var(--ink-faint)" style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchPh} className="oc-input" style={{ paddingInlineStart: 34, padding: "9px 12px 9px 34px" }} />
        </div>
        <select value={who} onChange={(e) => setWho(e.target.value)} className="oc-input" style={{ width: "auto", padding: "9px 12px" }}>
          <option value="">{t.filterUser}</option>{owners.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={mod} onChange={(e) => setMod(e.target.value)} className="oc-input" style={{ width: "auto", padding: "9px 12px" }}>
          <option value="">{t.filterModule}</option>{modules.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <Button variant="ghost" size="sm" icon={Download} onClick={exportCsv} disabled={!shown.length}>{t.export}</Button>
        <Button variant="danger" size="sm" icon={Trash2} onClick={() => setConfirm(true)} disabled={!events.length}>{t.clear}</Button>
      </div>
      <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 8 }}>{shown.length.toLocaleString()} {t.events}</div>
      {shown.length === 0 ? <EmptyState icon={ScrollText} body={t.empty} /> : (
        <div className="oc-scroll" style={{ maxHeight: 520, overflowY: "auto" }}>
          {shown.slice(0, 400).map((e) => (
            <div key={e.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13, alignItems: "baseline", flexWrap: "wrap" }}>
              <span className="oc-mono" style={{ color: "var(--ink-faint)", fontSize: 11.5, minWidth: 118 }}>
                {new Date(e.at).toLocaleString(lang === "ar" ? "ar" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
              <Badge>{e.owner}</Badge>
              <strong style={{ fontWeight: 650 }}>{e.module}</strong>
              <span style={{ color: "var(--ink-faint)" }}>{e.action}</span>
              {e.detail && <span style={{ color: "var(--ink-soft)", minWidth: 0, flex: "1 1 200px" }}>— {e.detail}</span>}
            </div>
          ))}
        </div>
      )}
      <Sheet open={confirm} onClose={() => setConfirm(false)} title={t.confirmClear}
        footer={<>
          <Button variant="ghost" onClick={() => setConfirm(false)}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
          <Button variant="danger" icon={Trash2} onClick={async () => { try { await requireAdmin(user.username); await clearEvents("*"); toast(t.cleared); } catch (e) { toast(errText(e, lang), { tone: "danger" }); } setConfirm(false); }}>{t.clear}</Button>
        </>} />
    </Card>
  );
}

function ControlsTab({ t }) {
  const [est, setEst] = useState(null);
  const [persisted, setPersisted] = useState(null);
  useEffect(() => {
    storageEstimate().then(setEst);
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(false));
  }, []);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card padded={false}>
        {t.controls.map(([I, title, body]) => (
          <div key={title} style={{ display: "flex", gap: 12, padding: "14px 16px", borderBottom: "1px solid var(--border)", alignItems: "flex-start" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--success-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><I size={16} color="var(--success)" /></div>
            <div><div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div><div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 3, lineHeight: 1.5 }}>{body}</div></div>
          </div>
        ))}
      </Card>
      <Card>
        <CardTitle>{t.storage}</CardTitle>
        <div className="oc-mono" style={{ fontSize: 22, fontWeight: 700 }}>{est ? fmtBytes(est.usage) : "—"}<span style={{ fontSize: 13, color: "var(--ink-faint)" }}>{est?.quota ? ` / ${fmtBytes(est.quota)}` : ""}</span></div>
        <div style={{ marginTop: 8 }}>{persisted == null ? null : <Badge tone={persisted ? "success" : "spark"}>{persisted ? t.persisted : t.notPersisted}</Badge>}</div>
      </Card>
    </div>
  );
}
