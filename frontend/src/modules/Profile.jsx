import React, { useState } from "react";
import { ShieldCheck, Users, LogOut, KeyRound, Save, CircleDot, CheckCircle2, Lock, Trash2, Pencil } from "lucide-react";
import { Card, CardTitle, SectionHeader, ModuleShell, Button, Badge, Field, Notice, Sheet, EmptyState, toast } from "../ui.jsx";
import { useOwned, errText, timeAgo, logEvent } from "../lib/data.js";
import { updateProfile, changePassword, deleteOwnAccount, sessionInfo, ADMIN, PASSWORD_POLICY } from "../lib/auth.js";
import { NAV_ITEMS } from "../i18n.js";

const T = {
  en: {
    eyebrow: "Account", title: "Your profile", desc: "Your identity on this device, what your role can reach, and your recent activity.",
    fullName: "Full name", username: "Username", role: "Role", joined: "Joined", session: "Session expires", edit: "Edit name", save: "Save", saved: "Profile updated",
    access: "What your role can access", adminOnly: "Platform Admin only", activity: "Your recent activity", noActivity: "Nothing recorded yet.",
    password: "Change password", current: "Current password", next: "New password", confirm: "Confirm new password", change: "Update password", changed: "Password updated",
    mismatch: "New passwords don't match.", signOut: "Sign out", danger: "Delete account", dangerBody: "Permanently deletes your account and everything you created in this browser.",
    deleteConfirm: "Enter your password to permanently delete your account and data.", deleteBtn: "Delete my account",
  },
  ar: {
    eyebrow: "الحساب", title: "ملفك الشخصي", desc: "هويتك على هذا الجهاز، وما يصل إليه دورك، ونشاطك الأخير.",
    fullName: "الاسم الكامل", username: "اسم المستخدم", role: "الدور", joined: "تاريخ الانضمام", session: "تنتهي الجلسة", edit: "تعديل الاسم", save: "حفظ", saved: "تم تحديث الملف",
    access: "ما يمكن لدورك الوصول إليه", adminOnly: "لمسؤولي المنصة فقط", activity: "نشاطك الأخير", noActivity: "لم يُسجَّل شيء بعد.",
    password: "تغيير كلمة المرور", current: "كلمة المرور الحالية", next: "كلمة المرور الجديدة", confirm: "تأكيد كلمة المرور الجديدة", change: "تحديث كلمة المرور", changed: "تم تحديث كلمة المرور",
    mismatch: "كلمتا المرور الجديدتان غير متطابقتين.", signOut: "تسجيل الخروج", danger: "حذف الحساب", dangerBody: "يحذف حسابك وكل ما أنشأته في هذا المتصفح نهائيًا.",
    deleteConfirm: "أدخل كلمة المرور لحذف حسابك وبياناتك نهائيًا.", deleteBtn: "احذف حسابي",
  },
};

export default function Profile({ lang, user, setUser, onSignOut }) {
  const t = T[lang];
  const isAdmin = user.role === ADMIN;
  const [events] = useOwned("events", user.username, { sort: (a, b) => b.at - a.at });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.full_name);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwErr, setPwErr] = useState(null);
  const [pwBusy, setPwBusy] = useState(false);
  const [del, setDel] = useState(false);
  const [delPw, setDelPw] = useState("");
  const [delErr, setDelErr] = useState(null);
  const s = sessionInfo();
  const initials = user.full_name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const saveName = async () => {
    try { const u = await updateProfile(user.username, { fullName: name }); setUser(u); setEditing(false); toast(t.saved); }
    catch (e) { toast(errText(e, lang), { tone: "danger" }); }
  };
  const savePw = async (e) => {
    e.preventDefault(); setPwErr(null);
    if (pw.next !== pw.confirm) { setPwErr(t.mismatch); return; }
    setPwBusy(true);
    try { await changePassword(user.username, pw.current, pw.next); await logEvent(user.username, "auth", "password_changed", ""); setPw({ current: "", next: "", confirm: "" }); toast(t.changed); }
    catch (err) { setPwErr(errText(err, lang)); }
    finally { setPwBusy(false); }
  };
  const deleteAccount = async () => {
    setDelErr(null);
    try { await deleteOwnAccount(user.username, delPw); onSignOut(); }
    catch (e) { setDelErr(errText(e, lang)); }
  };

  return (
    <ModuleShell>
      <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc} />
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, flexShrink: 0, background: isAdmin ? "linear-gradient(135deg, #0C8479, #2DD4BF)" : "var(--surface-sunken)", color: isAdmin ? "#fff" : "var(--ink-soft)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, fontFamily: "var(--font-display)" }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            {editing ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveName()} className="oc-input" autoFocus />
                <Button icon={Save} onClick={saveName} disabled={!name.trim()}>{t.save}</Button>
              </div>
            ) : (
              <div className="oc-display" style={{ fontSize: 22, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                {user.full_name}
                <button onClick={() => setEditing(true)} aria-label={t.edit} className="oc-press" style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ink-faint)" }}><Pencil size={15} /></button>
              </div>
            )}
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <Badge tone={isAdmin ? "accent" : "neutral"} icon={isAdmin ? ShieldCheck : Users}>{user.role}</Badge>
              <Badge>@{user.username}</Badge>
            </div>
          </div>
          <Button variant="ghost" icon={LogOut} onClick={onSignOut}>{t.signOut}</Button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 18 }}>
          {[[t.username, user.username], [t.role, user.role], [t.joined, user.createdAt ? new Date(user.createdAt).toLocaleDateString(lang === "ar" ? "ar" : "en-US") : "—"],
            [t.session, s?.expiresAt ? new Date(s.expiresAt).toLocaleString(lang === "ar" ? "ar" : "en-US", { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" }) : "—"]].map(([k, v]) => (
            <div key={k} style={{ background: "var(--surface-sunken)", borderRadius: 12, padding: "10px 13px" }}>
              <div style={{ fontSize: 11.5, color: "var(--ink-faint)", fontWeight: 650 }}>{k}</div>
              <div className="oc-mono" style={{ fontSize: 13.5, fontWeight: 650, marginTop: 3 }}>{v}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="oc-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14, alignItems: "start" }}>
        <Card>
          <CardTitle>{t.access}</CardTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {NAV_ITEMS.map((n) => {
              const ok = !n.admin || isAdmin;
              return (
                <div key={n.key} style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--border)", borderRadius: 11, padding: "8px 10px", opacity: ok ? 1 : 0.6 }}>
                  <n.icon size={14} color={ok ? "var(--accent)" : "var(--ink-faint)"} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.short[lang]}</span>
                  {ok ? <CheckCircle2 size={13} color="var(--success)" /> : <Lock size={13} color="var(--ink-faint)" />}
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <CardTitle>{t.password}</CardTitle>
          <form onSubmit={savePw} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input type="text" name="username" autoComplete="username" value={user.username} readOnly hidden />
            <Field label={t.current}><input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} className="oc-input" /></Field>
            <Field label={t.next} hint={`${PASSWORD_POLICY.minLength}+`}><input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} className="oc-input" /></Field>
            <Field label={t.confirm}><input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} className="oc-input" /></Field>
            {pwErr && <Notice tone="danger">{pwErr}</Notice>}
            <div><Button type="submit" icon={KeyRound} loading={pwBusy} disabled={!pw.current || !pw.next || !pw.confirm}>{t.change}</Button></div>
          </form>
        </Card>
      </div>

      <Card style={{ marginTop: 14 }}>
        <CardTitle>{t.activity}</CardTitle>
        {events.length === 0 ? <EmptyState icon={CircleDot} body={t.noActivity} /> : (
          <div className="oc-scroll" style={{ maxHeight: 380, overflowY: "auto" }}>
            {events.slice(0, 80).map((e) => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                <CircleDot size={11} color="var(--accent)" style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <strong style={{ fontWeight: 650 }}>{e.module}</strong> · {e.action}{e.detail && <span style={{ color: "var(--ink-faint)" }}> — {e.detail}</span>}
                </span>
                <span style={{ fontSize: 11.5, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>{timeAgo(e.at, lang)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card style={{ marginTop: 14, borderColor: "var(--danger-soft)" }}>
        <CardTitle sub={t.dangerBody}>{t.danger}</CardTitle>
        <Button variant="danger" icon={Trash2} onClick={() => setDel(true)}>{t.danger}</Button>
      </Card>
      <Sheet open={del} onClose={() => { setDel(false); setDelPw(""); setDelErr(null); }} title={t.danger}
        footer={<><Button variant="ghost" onClick={() => setDel(false)}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button><Button variant="danger" icon={Trash2} onClick={deleteAccount} disabled={!delPw}>{t.deleteBtn}</Button></>}>
        <div style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 12 }}>{t.deleteConfirm}</div>
        <input type="password" autoComplete="current-password" value={delPw} onChange={(e) => setDelPw(e.target.value)} className="oc-input" />
        {delErr && <Notice tone="danger" style={{ marginTop: 10 }}>{delErr}</Notice>}
      </Sheet>
    </ModuleShell>
  );
}
