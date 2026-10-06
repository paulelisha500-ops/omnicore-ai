import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState, Component } from "react";
import {
  Menu, X, Globe, Settings, Bell, LogOut, Users, ShieldCheck, Zap, Sparkles, Cpu, Download, Moon, SunMedium,
  MoreHorizontal, CheckCheck, Trash2, AlertTriangle, Loader2, Gauge, PanelLeftClose, PanelLeft, BellOff,
} from "lucide-react";
import { TOKENS } from "./styles.js";
import { commonText, NAV_ITEMS, GROUP_LABEL, TAB_BAR } from "./i18n.js";
import { ThemeCtx, Toaster, Sheet, Button, IconButton, ProgressBar, Badge, EmptyState, Skeleton, toast } from "./ui.jsx";
import { restoreSession, signOut as authSignOut } from "./lib/auth.js";
import { requestPersistence } from "./lib/db.js";
import { useOwned, markAllRead, clearNotifications, timeAgo, logEvent } from "./lib/data.js";
import { useAI, acceptConsent, declineConsent, warmIfCached, MODELS, ASR_MODEL, fmtMB, fmtBytes, progressOf, sizeOf, loadingName } from "./lib/ai.js";
import InstallButton from "./InstallButton.jsx";
import { completeSignInIfPresent, signInWithHF, signInAvailable, useHFSession, SPACE_APP_URL } from "./lib/hfauth.js";
import { setEngine, closeSigninPrompt, openSigninPrompt } from "./lib/ai.js";
import { startEngine } from "./lib/automation.js";
import { on } from "./lib/bus.js";

const LandingPage = lazy(() => import("./LandingPage.jsx"));
const AuthScreen = lazy(() => import("./AuthScreen.jsx"));

const MODULES = {
  dashboard: () => import("./modules/Dashboard.jsx"),
  chat: () => import("./modules/Chat.jsx"),
  documents: () => import("./modules/Documents.jsx"),
  vision: () => import("./modules/Vision.jsx"),
  speech: () => import("./modules/Speech.jsx"),
  agents: () => import("./modules/Agents.jsx"),
  analytics: () => import("./modules/Analytics.jsx"),
  recommend: () => import("./modules/Recommend.jsx"),
  search: () => import("./modules/Search.jsx"),
  trade: () => import("./modules/Trade.jsx"),
  automation: () => import("./modules/Automation.jsx"),
  plugins: () => import("./modules/Integrations.jsx"),
  security: () => import("./modules/Security.jsx"),
  profile: () => import("./modules/Profile.jsx"),
  settings: () => import("./modules/Settings.jsx"),
};
const LAZY = Object.fromEntries(Object.entries(MODULES).map(([k, f]) => [k, lazy(f)]));

/* ---------------------------------------------------------------------------
   Preferences
   --------------------------------------------------------------------------- */
const readPref = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
function useSystemDark() {
  const [dark, setDark] = useState(() => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const f = (e) => setDark(e.matches);
    mq.addEventListener?.("change", f);
    return () => mq.removeEventListener?.("change", f);
  }, []);
  return dark;
}

/* Hash routing: deep links (#/chat), and the browser/phone back gesture works. */
function useHashRoute() {
  const parse = () => (window.location.hash.replace(/^#\/?/, "").split(/[/?]/)[0] || "dashboard");
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const f = () => setRoute(parse());
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  const go = useCallback((key) => {
    if (`#/${key}` !== window.location.hash) window.location.hash = `/${key}`;
    else setRoute(key);
  }, []);
  return [MODULES[route] ? route : "dashboard", go];
}

class ModuleBoundary extends Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidUpdate(prev) { if (prev.moduleKey !== this.props.moduleKey && this.state.error) this.setState({ error: null }); }
  render() {
    if (!this.state.error) return this.props.children;
    const ar = this.props.lang === "ar";
    return (
      <div style={{ maxWidth: 520, margin: "60px auto" }}>
        <EmptyState icon={AlertTriangle} title={ar ? "حدث خطأ في هذه الوحدة" : "This screen hit an error"}
          body={String(this.state.error?.message || this.state.error)}
          action={<Button onClick={() => this.setState({ error: null })}>{ar ? "إعادة المحاولة" : "Try again"}</Button>} />
      </div>
    );
  }
}

const ModuleFallback = () => (
  <div className="oc-fade-up" style={{ maxWidth: 1180, marginInline: "auto" }}>
    <Skeleton w={120} h={12} style={{ marginBottom: 12 }} />
    <Skeleton w={320} h={30} style={{ marginBottom: 12 }} />
    <Skeleton w="60%" h={14} style={{ marginBottom: 26 }} />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 14 }}>
      {[0, 1, 2].map((i) => <Skeleton key={i} h={150} r={18} />)}
    </div>
  </div>
);

/* ---------------------------------------------------------------------------
   Root
   --------------------------------------------------------------------------- */
export default function App() {
  const [lang, setLangState] = useState(() => (readPref("omnicore_lang", "en") === "ar" ? "ar" : "en"));
  const [themePref, setThemePref] = useState(() => readPref("omnicore_theme", "system"));
  const systemDark = useSystemDark();
  const theme = themePref === "system" ? (systemDark ? "dark" : "light") : themePref;
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [screen, setScreen] = useState("landing"); // landing | auth
  const [authNotice, setAuthNotice] = useState(null);

  const setLang = useCallback((l) => { setLangState(l); try { localStorage.setItem("omnicore_lang", l); } catch { /* private mode */ } }, []);
  const setTheme = useCallback((t) => { setThemePref(t); try { localStorage.setItem("omnicore_theme", t); } catch { /* private mode */ } }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", user ? (theme === "dark" ? "#0A0C0F" : "#F5F5F2") : "#FBF1E4");
  }, [theme, user]);

  useEffect(() => {
    // Finish a "Sign in with Hugging Face" round-trip first (it returns here with ?code=…).
    completeSignInIfPresent()
      .catch(() => null)
      .then(() => restoreSession())
      .then(({ user: u, expired }) => {
        if (u) setUser(u);
        else if (expired) { setAuthNotice(lang === "ar" ? "انتهت جلستك. سجّل الدخول مرة أخرى." : "Your session expired. Please sign in again."); setScreen("auth"); }
      })
      .catch(() => {})
      .finally(() => setBooting(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onAuthed = useCallback((u) => {
    setUser(u); setAuthNotice(null);
    if (!window.location.hash) window.location.hash = "/dashboard";
  }, []);
  const onSignOut = useCallback(() => {
    if (user) logEvent(user.username, "auth", "signed_out", "");
    authSignOut(); setUser(null); setScreen("landing");
    history.replaceState(null, "", window.location.pathname);
  }, [user]);

  if (booting) {
    return (
      <div className="oc-root" data-theme={theme} style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{TOKENS}</style>
        <Loader2 size={24} className="oc-spin" color="var(--ink-faint)" />
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={<div style={{ minHeight: "100vh", background: "#FBF1E4" }} />}>
        {screen === "landing"
          ? <LandingPage lang={lang} setLang={setLang} onGetStarted={() => setScreen("auth")} />
          : <AuthScreen lang={lang} setLang={setLang} onAuthed={onAuthed} onBack={() => setScreen("landing")} notice={authNotice} />}
      </Suspense>
    );
  }

  return (
    <ThemeCtx.Provider value={theme}>
      <Shell lang={lang} setLang={setLang} theme={theme} themePref={themePref} setTheme={setTheme} user={user} setUser={setUser} onSignOut={onSignOut} />
    </ThemeCtx.Provider>
  );
}

/* ---------------------------------------------------------------------------
   Signed-in shell
   --------------------------------------------------------------------------- */
function Shell({ lang, setLang, theme, themePref, setTheme, user, setUser, onSignOut }) {
  const [route, go] = useHashRoute();
  const [collapsed, setCollapsed] = useState(() => readPref("omnicore_sidebar", "open") === "collapsed");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const isAdmin = user.role === "Platform Admin";

  // Session start: keep data safe from eviction, run the automation engine,
  // warm the AI model if it's cached, and prefetch screens so tab switches are instant.
  useEffect(() => {
    requestPersistence();
    const stop = startEngine(user.username);
    warmIfCached();
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1200));
    const h = idle(() => Object.values(MODULES).forEach((load) => load().catch(() => {})));
    return () => { stop(); window.cancelIdleCallback?.(h); };
  }, [user.username]);

  useEffect(() => on("notification", (n) => {
    if (n.owner === user.username && n.kind !== "info") toast(n.title, { tone: n.kind === "error" ? "danger" : "info" });
  }), [user.username]);

  useEffect(() => { document.querySelector(".oc-content")?.scrollTo({ top: 0 }); setMobileOpen(false); }, [route]);

  const toggleCollapse = () => setCollapsed((v) => { const n = !v; try { localStorage.setItem("omnicore_sidebar", n ? "collapsed" : "open"); } catch { /* ignore */ } return n; });

  const nav = NAV_ITEMS.find((n) => n.key === route);
  const title = route === "settings" ? commonText[lang].settings : route === "profile" ? commonText[lang].profile : nav ? nav[lang] : "";
  const Module = LAZY[route];

  return (
    <div dir={dir} className="oc-root" data-theme={theme}>
      <style>{TOKENS}</style>
      <div className="oc-app">
        <Sidebar lang={lang} route={route} go={go} collapsed={collapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} isAdmin={isAdmin} />
        <div className="oc-main">
          <header className="oc-topbar">
            <span className="oc-mobile-only"><IconButton icon={Menu} title={lang === "ar" ? "القائمة" : "Menu"} onClick={() => setMobileOpen(true)} /></span>
            <span className="oc-desktop-only"><IconButton icon={collapsed ? PanelLeft : PanelLeftClose} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={toggleCollapse} /></span>
            <div className="oc-display" style={{ fontWeight: 700, fontSize: 16, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
            <AIStatusPill lang={lang} go={go} />
            <IconButton icon={theme === "dark" ? SunMedium : Moon} title={theme === "dark" ? "Light mode" : "Dark mode"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")} />
            <button onClick={() => setLang(lang === "en" ? "ar" : "en")} className="oc-press oc-focusable oc-hide-sm" style={{
              display: "flex", alignItems: "center", gap: 6, background: "var(--surface-sunken)", border: "1px solid var(--border)",
              borderRadius: 99, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
              <Globe size={13} /> {lang === "en" ? "العربية" : "English"}
            </button>
            <InstallButton lang={lang} render={({ label, icon, onClick }) => (
              <span className="oc-hide-sm"><Button size="sm" variant="ghost" icon={icon} onClick={onClick}>{label}</Button></span>
            )} />
            <NotifButton lang={lang} user={user} onOpen={() => setNotifOpen(true)} />
            <AvatarMenu lang={lang} user={user} go={go} onSignOut={onSignOut} />
          </header>
          <main className="oc-content oc-scroll">
            <ModuleBoundary lang={lang} moduleKey={route}>
              <Suspense fallback={<ModuleFallback />}>
                {route === "security" && !isAdmin
                  ? <AdminOnly lang={lang} />
                  : <Module key={route} lang={lang} setLang={setLang} user={user} setUser={setUser} go={go}
                      theme={themePref} setTheme={setTheme} onSignOut={onSignOut} />}
              </Suspense>
            </ModuleBoundary>
          </main>
        </div>
      </div>
      <TabBar lang={lang} route={route} go={go} openMore={() => setMobileOpen(true)} />
      <NotificationsSheet lang={lang} user={user} open={notifOpen} onClose={() => setNotifOpen(false)} go={go} />
      <AIConsentSheet lang={lang} />
      <SignInSheet lang={lang} />
      <DownloadPill lang={lang} />
      <Toaster />
    </div>
  );
}

function AdminOnly({ lang }) {
  const c = commonText[lang];
  return (
    <div className="oc-page" style={{ maxWidth: 520, margin: "60px auto" }}>
      <EmptyState icon={ShieldCheck} title={c.adminOnly} body={c.adminOnlyDesc} />
    </div>
  );
}

function Sidebar({ lang, route, go, collapsed, mobileOpen, setMobileOpen, isAdmin }) {
  const c = commonText[lang];
  const ai = useAI();
  return (
    <>
      <div className={`oc-sidebar-backdrop ${mobileOpen ? "show" : ""}`} onClick={() => setMobileOpen(false)} />
      <aside className={`oc-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`} aria-label={commonText[lang].mainNav}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px", height: 58, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg, #0C8479, #2DD4BF)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Zap size={16} color="#fff" />
          </div>
          {!collapsed && <div className="oc-display" style={{ color: "#fff", fontSize: 15, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{c.appName}</div>}
          <button onClick={() => setMobileOpen(false)} className="oc-mobile-only oc-focusable" aria-label={c.close}
            style={{ marginInlineStart: "auto", background: "none", border: "none", color: "var(--rail-ink-dim)", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>
        <nav className="oc-scroll" style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
          {["overview", "ai", "data", "ops"].map((g) => (
            <div key={g} style={{ marginBottom: 14 }}>
              {!collapsed && <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--rail-ink-dim)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 10px", marginBottom: 6 }}>{GROUP_LABEL[lang][g]}</div>}
              {NAV_ITEMS.filter((n) => n.group === g && (!n.admin || isAdmin)).map((n) => {
                const active = route === n.key;
                const Icon = n.icon;
                return (
                  <button key={n.key} onClick={() => go(n.key)} className="oc-nav-btn oc-focusable oc-press" title={collapsed ? n[lang] : undefined}
                    aria-current={active ? "page" : undefined}
                    style={{
                      display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "9px 11px", borderRadius: 10, border: "none",
                      background: active ? "var(--rail-active)" : "transparent", color: active ? "#fff" : "var(--rail-ink)",
                      fontSize: 13.5, fontWeight: active ? 650 : 500, cursor: "pointer", marginBottom: 2, textAlign: "start",
                      boxShadow: active ? "inset 2px 0 0 #2BB3A5" : "none", justifyContent: collapsed ? "center" : "flex-start",
                    }}>
                    <Icon size={17} style={{ flexShrink: 0, color: active ? "#2DD4BF" : undefined }} />
                    {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n[lang]}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        {!collapsed && (
          <div style={{ padding: 14, borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 7, color: "var(--rail-ink-dim)", fontSize: 11.5, lineHeight: 1.4 }}>
            <Cpu size={13} color="#E6A83F" style={{ flexShrink: 0 }} />
            {ai.engine === "cloud"
              ? (lang === "ar" ? "ذكاء اصطناعي فوري عبر الإنترنت — بلا تنزيل" : "Instant online AI — nothing to download")
              : (lang === "ar" ? "الذكاء الاصطناعي يعمل على جهازك — خاص بالكامل" : "AI runs on your device — fully private")}
          </div>
        )}
      </aside>
    </>
  );
}

function TabBar({ lang, route, go, openMore }) {
  const items = TAB_BAR.map((k) => NAV_ITEMS.find((n) => n.key === k));
  return (
    <nav className="oc-tabbar" aria-label={commonText[lang].quickNav}>
      {items.map((n) => {
        const active = route === n.key;
        return (
          <button key={n.key} onClick={() => go(n.key)} className="oc-press" aria-current={active ? "page" : undefined}
            style={{ flex: 1, border: "none", background: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
              color: active ? "var(--accent)" : "var(--ink-faint)", fontSize: 10.5, fontWeight: 650, cursor: "pointer" }}>
            <n.icon size={22} strokeWidth={active ? 2.3 : 1.9} />{n.short[lang]}
          </button>
        );
      })}
      <button onClick={openMore} className="oc-press" style={{ flex: 1, border: "none", background: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, color: "var(--ink-faint)", fontSize: 10.5, fontWeight: 650, cursor: "pointer" }}>
        <MoreHorizontal size={22} />{commonText[lang].more}
      </button>
    </nav>
  );
}

function AIStatusPill({ lang, go }) {
  const ai = useAI();
  const hf = useHFSession();
  const ar = lang === "ar";
  let label, tone = "neutral", icon = Cpu;
  const needsSignIn = ai.engine === "cloud" && !hf;
  if (ai.loadingKey) {
    const p = progressOf(ai);
    label = p != null && ai.loaded ? `${Math.round(p * 100)}%` : (ar ? "جارٍ التحميل" : "Loading");
    tone = "spark"; icon = Download;
  } else if (ai.busy) { label = ar ? "يفكّر…" : "Thinking…"; tone = "spark"; icon = Sparkles; }
  else if (needsSignIn) { label = ar ? "سجّل الدخول للذكاء الاصطناعي" : "Sign in for AI"; tone = "spark"; icon = Sparkles; }
  else if (ai.engine === "cloud") { label = ar ? "ذكاء عبر الإنترنت" : "Online AI"; tone = "success"; icon = Globe; }
  else if (ai.phase === "ready") { label = ai.device === "webgpu" ? "WebGPU" : "CPU"; tone = "success"; icon = Gauge; }
  else if (ai.phase === "error") { label = ar ? "خطأ" : "AI error"; tone = "danger"; icon = AlertTriangle; }
  else { label = ar ? "الذكاء المحلي" : "On-device AI"; }
  return (
    <button onClick={() => (needsSignIn ? openSigninPrompt() : go("settings"))} className="oc-press oc-focusable oc-hide-sm" title={ar ? "محرك الذكاء الاصطناعي" : "AI engine"}
      style={{ border: "none", background: "none", padding: 0, cursor: "pointer" }}>
      <Badge tone={tone} icon={ai.busy && !ai.loadingKey ? Loader2 : icon}>{label}</Badge>
    </button>
  );
}

function NotifButton({ lang, user, onOpen }) {
  const [items] = useOwned("notifications", user.username);
  const unread = items.filter((n) => !n.read).length;
  return <IconButton icon={Bell} title={commonText[lang].notifications} onClick={onOpen} badge={unread} />;
}

function NotificationsSheet({ lang, user, open, onClose, go }) {
  const [items] = useOwned("notifications", user.username);
  const ar = lang === "ar";
  useEffect(() => { if (open && items.some((n) => !n.read)) { const t = setTimeout(() => markAllRead(user.username), 1200); return () => clearTimeout(t); } }, [open, items, user.username]);
  return (
    <Sheet open={open} onClose={onClose} title={commonText[lang].notifications}
      footer={items.length ? <>
        <Button variant="ghost" size="sm" icon={CheckCheck} onClick={() => markAllRead(user.username)}>{ar ? "تعليم الكل كمقروء" : "Mark all read"}</Button>
        <Button variant="danger" size="sm" icon={Trash2} onClick={() => clearNotifications(user.username)}>{ar ? "مسح الكل" : "Clear all"}</Button>
      </> : null}>
      {items.length === 0
        ? <EmptyState icon={BellOff} title={ar ? "لا إشعارات" : "You're all caught up"} body={ar ? "تظهر هنا نتائج الأتمتة والمهام المكتملة." : "Automation results and finished tasks appear here."}
            action={<Button variant="ghost" size="sm" onClick={() => { onClose(); go("automation"); }}>{ar ? "إعداد أتمتة" : "Set up an automation"}</Button>} />
        : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.slice(0, 60).map((n) => (
              <div key={n.id} style={{ display: "flex", gap: 10, padding: "10px 12px", borderRadius: 14, background: n.read ? "var(--surface-sunken)" : "var(--accent-soft)" }}>
                <div style={{ width: 8, height: 8, borderRadius: 99, marginTop: 6, flexShrink: 0, background: n.kind === "error" ? "var(--danger)" : n.read ? "var(--border-strong)" : "var(--accent)" }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 650 }}>{n.title}</div>
                  {n.body && <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2, whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{n.body}</div>}
                  <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 4 }}>{timeAgo(n.at, lang)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
    </Sheet>
  );
}

function AvatarMenu({ lang, user, go, onSignOut }) {
  const [open, setOpen] = useState(false);
  const initials = (user.full_name || user.username).split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const item = (icon, label, fn, danger) => {
    const I = icon;
    return (
      <button onClick={() => { setOpen(false); fn(); }} className="oc-focusable oc-nav-item" style={{
        width: "100%", textAlign: "start", padding: "10px 14px", background: "none", border: "none", cursor: "pointer",
        fontSize: 13.5, color: danger ? "var(--danger)" : "var(--ink)", display: "flex", alignItems: "center", gap: 9 }}>
        <I size={15} /> {label}
      </button>
    );
  };
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} className="oc-press oc-focusable" aria-haspopup="menu" aria-expanded={open} aria-label={user.full_name}
        style={{ width: 34, height: 34, borderRadius: 99, background: user.role === "Platform Admin" ? "linear-gradient(135deg, #0C8479, #2DD4BF)" : "var(--ink)", color: "#fff",
          border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>
        {initials}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 29 }} />
          <div role="menu" className="oc-fade-up" style={{ position: "absolute", insetInlineEnd: 0, top: 44, background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 16, boxShadow: "var(--shadow-lg)", minWidth: 220, zIndex: 30, overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{user.full_name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--ink-faint)", marginTop: 2 }}>
                {user.role === "Platform Admin" ? <ShieldCheck size={12} color="var(--accent)" /> : <Users size={12} />} @{user.username} · {user.role}
              </div>
            </div>
            {item(Users, commonText[lang].profile, () => go("profile"))}
            {item(Settings, commonText[lang].settings, () => go("settings"))}
            {item(LogOut, commonText[lang].logout, onSignOut, true)}
          </div>
        </>
      )}
    </div>
  );
}

/* One-time download consent for each on-device model. */
function AIConsentSheet({ lang }) {
  const ai = useAI();
  const ar = lang === "ar";
  const key = ai.consentFor;
  const isAsr = key === "asr";
  const model = isAsr ? ASR_MODEL : MODELS[key];
  const isVision = !isAsr && key && key !== ai.modelKey;
  const gpu = ai.caps?.webgpu;
  const size = key ? sizeOf(key, ai.caps) : 0;
  const title = isAsr ? (ar ? "تنزيل نموذج التعرّف على الكلام؟" : "Download the speech model?")
    : isVision ? (ar ? "تنزيل نموذج الرؤية؟" : "Download the vision model?")
    : (ar ? "تنزيل نموذج الذكاء الاصطناعي على الجهاز؟" : "Download the on-device AI model?");
  const body = isAsr
    ? (ar ? "يُحوِّل Whisper الكلام إلى نص على جهازك مباشرة. يُنزَّل مرة واحدة ثم يُحفظ في متصفحك." : "Whisper turns speech into text right on your device. It downloads once, then stays cached in your browser.")
    : isVision
      ? (ar ? `لقراءة الصور والمستندات الممسوحة يحتاج أومنيكور إلى ${model?.name}، وهو نموذج يفهم الصور. يُنزَّل مرة واحدة فقط.` : `To read images and scanned pages, OmniCore uses ${model?.name}, a model that understands pictures. It downloads once.`)
      : (ar ? `يعمل ${model?.name} داخل متصفحك ويشغّل المحادثة والمستندات والوكلاء. يُنزَّل مرة واحدة من Hugging Face ثم يُحفظ في متصفحك.` : `${model?.name} runs inside your browser and powers chat, documents and agents. It downloads once from Hugging Face, then stays cached in your browser.`);
  return (
    <Sheet open={Boolean(key)} onClose={declineConsent} title={title}
      footer={<>
        <Button variant="ghost" onClick={declineConsent}>{ar ? "ليس الآن" : "Not now"}</Button>
        <Button variant="accent" icon={Download} onClick={acceptConsent}>{ar ? `تنزيل (${fmtMB(size)})` : `Download (${fmtMB(size)})`}</Button>
      </>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14, lineHeight: 1.6, color: "var(--ink-soft)" }}>
        <p style={{ margin: 0 }}>{body}</p>
        <div style={{ display: "grid", gap: 8 }}>
          <Row icon={ShieldCheck} text={ar ? "خاص: رسائلك وملفاتك لا تغادر جهازك أبدًا." : "Private: your messages and files never leave this device."} />
          <Row icon={Gauge} text={gpu == null ? (ar ? "جارٍ فحص بطاقة الرسومات…" : "Checking your graphics hardware…")
            : gpu ? (ar ? "تم اكتشاف WebGPU — سيعمل على بطاقة الرسومات." : "WebGPU detected — it will run on your graphics card.")
            : (ar ? "لا يتوفر WebGPU — سيعمل على المعالج، وهو أبطأ لكنه يعمل." : "No WebGPU here — it will run on the CPU, which is slower but works.")} />
          <Row icon={Download} text={ar ? `الحجم ≈ ${fmtMB(size)}. يُفضَّل استخدام Wi-Fi.` : `Size ≈ ${fmtMB(size)}. Wi-Fi recommended.`} />
        </div>
      </div>
    </Sheet>
  );
}
/* Shown when an AI feature needs the online engine and nobody is signed in. */
function SignInSheet({ lang }) {
  const ai = useAI();
  const ar = lang === "ar";
  const available = signInAvailable();
  const [busy, setBusy] = useState(false);
  return (
    <Sheet open={ai.signinPrompt} onClose={closeSigninPrompt} title={ar ? "استخدم الذكاء الاصطناعي عبر الإنترنت" : "Use AI online — nothing to download"}
      footer={<>
        <Button variant="ghost" onClick={() => { setEngine("local"); closeSigninPrompt(); }}>{ar ? "استخدم الذكاء على الجهاز بدلًا من ذلك" : "Use on-device AI instead"}</Button>
        {available
          ? <Button variant="accent" loading={busy} onClick={() => { setBusy(true); signInWithHF().catch(() => setBusy(false)); }}>{ar ? "تسجيل الدخول عبر Hugging Face" : "Sign in with Hugging Face"}</Button>
          : <a href={SPACE_APP_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}><Button variant="accent">{ar ? "افتح أومنيكور على Hugging Face" : "Open OmniCore on Hugging Face"}</Button></a>}
      </>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14, lineHeight: 1.6, color: "var(--ink-soft)" }}>
        <p style={{ margin: 0 }}>
          {available
            ? (ar ? "سجّل الدخول بحساب Hugging Face المجاني مرة واحدة. يعمل الذكاء الاصطناعي على خوادم Hugging Face باستخدام الرصيد الشهري المجاني لحسابك — لا تنزيل ولا مفتاح API."
                  : "Sign in once with your free Hugging Face account. The AI then runs on Hugging Face's servers using your account's free monthly credit — no download, no API key.")
            : (ar ? "تسجيل الدخول عبر Hugging Face متاح في نسخة أومنيكور المستضافة على Hugging Face. افتحها هناك، أو استخدم الذكاء الاصطناعي على جهازك هنا."
                  : "Sign-in with Hugging Face is available on the Hugging Face–hosted OmniCore. Open it there, or use the on-device AI here.")}
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          <Row icon={Sparkles} text={ar ? "GPT-OSS 20B للنصوص وQwen3-VL للصور — إجابات خلال ثانية تقريبًا." : "GPT-OSS 20B for text and Qwen3-VL for images — answers in about a second."} />
          <Row icon={ShieldCheck} text={ar ? "يبقى الرمز في هذا المتصفح فقط، ويمكنك تسجيل الخروج من الإعدادات في أي وقت." : "Your sign-in token stays in this browser only. Sign out any time in Settings."} />
          <Row icon={Cpu} text={ar ? "تفضّل خصوصية كاملة؟ الذكاء على الجهاز يعمل دون اتصال بعد تنزيل لمرة واحدة." : "Prefer full privacy? On-device AI works offline after a one-time download."} />
        </div>
      </div>
    </Sheet>
  );
}

const Row = ({ icon: I, text }) => (
  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "var(--surface-sunken)", borderRadius: 12, padding: "9px 11px", fontSize: 13.5, color: "var(--ink)" }}>
    <I size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} /> <span>{text}</span>
  </div>
);

/* Floating download progress while model weights stream in. */
function DownloadPill({ lang }) {
  const ai = useAI();
  if (!ai.loadingKey) return null;
  const pct = ai.loaded ? progressOf(ai) : null;
  if (ai.loadingKey === "asr" && pct != null && pct >= 1) return null;
  const denom = Math.max(ai.total || 0, sizeOf(ai.loadingKey, ai.caps) * 1e6);
  const ar = lang === "ar";
  const name = loadingName(ai);
  return (
    <div className="oc-toast" role="status" style={{ position: "fixed", bottom: "calc(78px + env(safe-area-inset-bottom))", insetInlineEnd: 16, width: "min(92vw, 340px)", zIndex: 70, flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
        <Download size={15} color="var(--accent)" />
        <span style={{ fontWeight: 650, fontSize: 13.5, flex: 1 }}>{ar ? `جارٍ تجهيز ${name}` : `Setting up ${name}`}</span>
        <span className="oc-mono" style={{ fontSize: 12, color: "var(--ink-faint)" }}>{pct == null ? "…" : `${Math.round(pct * 100)}%`}</span>
      </div>
      <div style={{ width: "100%" }}><ProgressBar value={pct} /></div>
      <div style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>
        {ai.loaded ? `${fmtBytes(ai.loaded)} / ${fmtBytes(denom)}` : (ar ? "جارٍ التحضير…" : "Preparing…")}
        {pct != null && pct >= 0.999 ? (ar ? " · جارٍ التهيئة على جهازك" : " · initialising on your device") : ""}
      </div>
    </div>
  );
}
