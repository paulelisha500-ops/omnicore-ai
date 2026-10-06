import React, { useEffect, useState } from "react";
import { Zap, Globe, ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, ShieldCheck, HardDrive, KeyRound } from "lucide-react";
import { PREAUTH_TOKENS } from "./LandingPage.jsx";
import { commonText } from "./i18n.js";
import { createAccount, signIn, hasAccounts, PASSWORD_POLICY, LOCKOUT } from "./lib/auth.js";
import { logEvent, errText } from "./lib/data.js";

const T = {
  en: {
    signInTitle: "Welcome back", signInSub: "Sign in to your OmniCore workspace on this device.",
    createTitle: "Create your workspace", createSub: "Your account and data are stored securely in this browser. No email, no server, no tracking.",
    firstAdmin: "You're the first person on this device, so this account becomes the Platform Admin.",
    username: "Username", fullName: "Full name", password: "Password", confirm: "Confirm password",
    signIn: "Sign in", create: "Create account", working: "Please wait…",
    toCreate: "New here? Create an account", toSignIn: "Already have an account? Sign in",
    mismatch: "Passwords don't match.", back: "Back",
    strength: ["Too short", "Weak", "Fair", "Good", "Strong"],
    facts: [
      [ShieldCheck, `Passwords are hashed with PBKDF2-SHA-256 (${PASSWORD_POLICY.iterations.toLocaleString("en-US")} rounds) — never stored.`],
      [KeyRound, `${LOCKOUT.maxFailures} wrong attempts locks an account for ${LOCKOUT.minutes} minutes.`],
      [HardDrive, "Everything stays in this browser. Export it any time from Settings."],
    ],
  },
  ar: {
    signInTitle: "مرحبًا بعودتك", signInSub: "سجّل الدخول إلى مساحة عمل أومنيكور على هذا الجهاز.",
    createTitle: "أنشئ مساحة عملك", createSub: "حسابك وبياناتك محفوظة بأمان في هذا المتصفح. بلا بريد إلكتروني ولا خادم ولا تتبع.",
    firstAdmin: "أنت أول مستخدم على هذا الجهاز، لذا سيصبح هذا الحساب مسؤول المنصة.",
    username: "اسم المستخدم", fullName: "الاسم الكامل", password: "كلمة المرور", confirm: "تأكيد كلمة المرور",
    signIn: "تسجيل الدخول", create: "إنشاء الحساب", working: "يرجى الانتظار…",
    toCreate: "جديد هنا؟ أنشئ حسابًا", toSignIn: "لديك حساب؟ سجّل الدخول",
    mismatch: "كلمتا المرور غير متطابقتين.", back: "رجوع",
    strength: ["قصيرة جدًا", "ضعيفة", "مقبولة", "جيدة", "قوية"],
    facts: [
      [ShieldCheck, `تُجزَّأ كلمات المرور بـ PBKDF2-SHA-256 (${PASSWORD_POLICY.iterations.toLocaleString("en-US")} دورة) — ولا تُحفظ أبدًا.`],
      [KeyRound, `${LOCKOUT.maxFailures} محاولات خاطئة تقفل الحساب ${LOCKOUT.minutes} دقيقة.`],
      [HardDrive, "كل شيء يبقى في هذا المتصفح. صدّره متى شئت من الإعدادات."],
    ],
  },
};

function strength(pw) {
  if (pw.length < PASSWORD_POLICY.minLength) return 0;
  let s = 1;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}

export default function AuthScreen({ lang, setLang, onAuthed, onBack, notice }) {
  const t = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;
  const [mode, setMode] = useState(null); // null while we check for accounts
  const [firstUser, setFirstUser] = useState(false);
  const [form, setForm] = useState({ username: "", fullName: "", password: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    hasAccounts().then((any) => { setFirstUser(!any); setMode(any ? "signin" : "create"); }).catch(() => setMode("signin"));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const creating = mode === "create";
  const st = strength(form.password);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (creating && form.password !== form.confirm) { setError(t.mismatch); return; }
    setBusy(true);
    try {
      const user = creating
        ? await createAccount({ username: form.username, fullName: form.fullName, password: form.password })
        : await signIn(form.username, form.password);
      await logEvent(user.username, "auth", creating ? "account_created" : "signed_in", user.role);
      onAuthed(user);
    } catch (err) {
      setError(errText(err, lang));
    } finally {
      setBusy(false);
    }
  };

  const input = (id, key, type = "text", auto) => (
    <input id={id} name={key} type={type} autoComplete={auto} value={form[key]} onChange={set(key)} className="oc-focusable"
      dir={key === "username" ? "ltr" : undefined}
      style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", fontSize: 15, background: "var(--cream)", outline: "none", fontFamily: "inherit", color: "var(--ink)" }} />
  );
  const label = (id, text) => <label htmlFor={id} style={{ fontSize: 12.5, fontWeight: 650, color: "var(--ink-soft)", display: "block", marginBottom: 6, marginTop: 14 }}>{text}</label>;
  const valid = form.username.trim() && form.password && (!creating || (form.fullName.trim() && form.confirm));

  return (
    <div dir={dir} className="oc-preauth" style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "72px 18px 30px", background: "var(--cream)" }}>
      <style>{PREAUTH_TOKENS}</style>
      <button onClick={onBack} className="oc-focusable" style={{ position: "fixed", top: 16, insetInlineStart: 16, display: "flex", alignItems: "center", gap: 6,
        background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 99, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "var(--maroon)" }}>
        <BackIcon size={14} /> {t.back}
      </button>
      <button onClick={() => setLang(lang === "en" ? "ar" : "en")} className="oc-focusable" style={{ position: "fixed", top: 16, insetInlineEnd: 16, display: "flex", alignItems: "center", gap: 6,
        background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 99, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "var(--maroon)" }}>
        <Globe size={14} /> {lang === "en" ? "العربية" : "English"}
      </button>

      <div className="oc-fade-up" style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg, #3A0A10, #C81E33)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", boxShadow: "0 12px 30px rgba(200,30,51,0.28)" }}>
            <Zap size={26} color="#fff" />
          </div>
          <div className="oc-display" style={{ fontSize: 26, fontWeight: 700, color: "var(--maroon)" }}>{creating ? t.createTitle : t.signInTitle}</div>
          <div style={{ fontSize: 14, color: "var(--ink-soft)", marginTop: 6, lineHeight: 1.55 }}>{creating ? t.createSub : t.signInSub}</div>
        </div>

        <div style={{ background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 20, padding: 22, boxShadow: "0 14px 40px rgba(58,10,16,0.08)" }}>
          {mode === null ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 30 }}><Loader2 className="oc-pulse-dot" color="var(--ink-faint)" /></div>
          ) : (
            <form onSubmit={submit} noValidate>
              {notice && <div role="status" style={{ fontSize: 13, color: "var(--maroon)", background: "var(--tan-soft)", borderRadius: 10, padding: "9px 11px", marginBottom: 6, lineHeight: 1.5 }}>{notice}</div>}
              {creating && firstUser && <div role="status" style={{ fontSize: 13, color: "var(--maroon)", background: "var(--tan-soft)", borderRadius: 10, padding: "9px 11px", lineHeight: 1.5 }}>{t.firstAdmin}</div>}
              {creating && <>{label("oc-full", t.fullName)}{input("oc-full", "fullName", "text", "name")}</>}
              {label("oc-user", t.username)}{input("oc-user", "username", "text", "username")}
              {label("oc-pass", t.password)}
              <div style={{ position: "relative" }}>
                {input("oc-pass", "password", show ? "text" : "password", creating ? "new-password" : "current-password")}
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? commonText[lang].hidePassword : commonText[lang].showPassword} className="oc-focusable"
                  style={{ position: "absolute", insetInlineEnd: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--ink-faint)", padding: 6 }}>
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {creating && (
                <>
                  <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                    {[1, 2, 3, 4].map((i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: st >= i ? ["", "#C81E33", "#D98A1F", "#6FA33A", "#1E7A4C"][st] : "var(--border)", transition: "background .25s" }} />)}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 5 }}>{form.password ? t.strength[st] : `${PASSWORD_POLICY.minLength}+`}</div>
                  {label("oc-confirm", t.confirm)}{input("oc-confirm", "confirm", show ? "text" : "password", "new-password")}
                </>
              )}
              {error && <div role="alert" style={{ fontSize: 13, color: "#8C1023", background: "var(--red-soft)", borderRadius: 10, padding: "9px 11px", marginTop: 14, lineHeight: 1.5 }}>{error}</div>}
              <button type="submit" disabled={busy || !valid} className="oc-focusable" style={{
                width: "100%", marginTop: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                background: busy || !valid ? "var(--border-strong)" : "var(--red)", color: "#fff", border: "none", borderRadius: 12, padding: "13px 16px",
                fontSize: 15, fontWeight: 700, cursor: busy || !valid ? "not-allowed" : "pointer", transition: "background .2s, transform .15s" }}>
                {busy && <Loader2 size={16} className="oc-pulse-dot" />}{busy ? t.working : creating ? t.create : t.signIn}
              </button>
              <button type="button" onClick={() => { setMode(creating ? "signin" : "create"); setError(null); }} className="oc-focusable"
                style={{ width: "100%", marginTop: 12, background: "none", border: "none", color: "var(--red-dark)", fontWeight: 700, fontSize: 13.5, cursor: "pointer", padding: 6 }}>
                {creating ? t.toSignIn : t.toCreate}
              </button>
            </form>
          )}
        </div>

        <div style={{ marginTop: 18, display: "grid", gap: 8 }}>
          {t.facts.map(([I, text], i) => (
            <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>
              <I size={14} color="var(--red-dark)" style={{ flexShrink: 0, marginTop: 2 }} /> {text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
