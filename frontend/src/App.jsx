import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Home, MessageSquare, FileText, Camera, Mic, Bot, TrendingUp, Sparkles,
  Search, Zap, Shield, Puzzle, Menu, X, Globe, Send, Upload, Play,
  CheckCircle2, AlertTriangle, Clock, Users, DollarSign, Activity,
  ChevronRight, ChevronDown, Loader2, Trash2, Plus, BarChart3, Bell,
  Volume2, PanelLeftClose, PanelLeft, StopCircle, RefreshCw, Link2,
  ShieldCheck, KeyRound, ScrollText, Workflow, PlugZap, Star, ImageIcon,
  CircleDot, BookMarked, ArrowUpRight, ArrowDownRight, Settings, LogOut,
  Moon, SunMedium, Palette, Database, ArrowLeft, ArrowRight, Scale, ExternalLink,
  BadgeCheck, Landmark,
} from "lucide-react";
import LandingPage, { PREAUTH_TOKENS } from "./LandingPage.jsx";
import { NumberTicker, BlurFade, BorderBeam } from "./magicui.jsx";

/* ============================================================================
   DESIGN TOKENS
   Concept: "OmniCore" = many signal streams (vision / speech / text / data)
   converging into one core. Deep-navy command rail + warm neutral canvas,
   teal as the single "core" accent, amber reserved ONLY for AI-generated
   moments (a consistent tell: amber spark = the platform's own reasoning).
   Monospace numerals throughout, tying back to "operating system".
   ============================================================================ */
const TOKENS = `
/* Fonts are loaded from index.html (<link>), not @import — see there. */

.oc-root {
  --bg: #F7F7F5;
  --surface: #FFFFFF;
  --surface-sunken: #F0F1EF;
  --border: #E4E4E0;
  --border-strong: #D3D3CD;
  --ink: #15171A;
  --ink-soft: #5B5F66;
  --ink-faint: #93968E;
  --rail-bg: #0B0F14;
  --rail-ink: #C7CCD1;
  --rail-ink-dim: #6E747C;
  --rail-active: #151B23;
  --accent: #0C8479;
  --accent-ink: #FFFFFF;
  --accent-soft: #E3F3F1;
  --spark: #B8790C;
  --spark-soft: #FBF1DE;
  --danger: #C0342A;
  --danger-soft: #FBEAE8;
  --success: #1E7A4C;
  --success-soft: #E7F5EC;
  --font-display: 'Space Grotesk', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  font-family: var(--font-body);
  color: var(--ink);
  background: var(--bg);
}
.oc-root * { box-sizing: border-box; }
.oc-display { font-family: var(--font-display); letter-spacing: -0.01em; }
.oc-mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
.oc-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.oc-scroll::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 8px; }
.oc-scroll::-webkit-scrollbar-track { background: transparent; }
@keyframes oc-shimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
.oc-skel { background: linear-gradient(90deg, var(--surface-sunken) 0%, #E6E7E3 50%, var(--surface-sunken) 100%); background-size: 200px 100%; animation: oc-shimmer 1.4s ease-in-out infinite; }
@keyframes oc-fade-up { from { opacity: 0; transform: translateY(6px);} to { opacity: 1; transform: translateY(0);} }
.oc-fade-up { animation: oc-fade-up 0.35s ease-out both; }
@keyframes oc-pulse-dot { 0%, 100% { opacity: 0.35; } 50% { opacity: 1; } }
.oc-pulse-dot { animation: oc-pulse-dot 1.1s ease-in-out infinite; }
.oc-focusable:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 8px; }
[dir="rtl"] .oc-flip { transform: scaleX(-1); }
@media (prefers-reduced-motion: reduce) {
  .oc-skel, .oc-fade-up, .oc-pulse-dot { animation: none !important; }
}
.oc-app { display: flex; min-height: 100vh; }
.oc-sidebar { width: 264px; flex-shrink: 0; background: var(--rail-bg); display: flex; flex-direction: column; transition: width 0.18s ease, transform 0.2s ease; }
.oc-sidebar.collapsed { width: 76px; }
.oc-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.oc-sidebar-backdrop { display: none; }
.oc-mobile-menu-btn { display: none; }
.oc-sidebar-close { display: none; }
@media (max-width: 900px) {
  .oc-sidebar { position: fixed; inset-block: 0; inset-inline-start: 0; z-index: 50; transform: translateX(-100%); height: 100vh; }
  [dir="rtl"] .oc-sidebar { transform: translateX(100%); }
  .oc-sidebar.mobile-open { transform: translateX(0); }
  .oc-sidebar.collapsed { width: 264px; }
  .oc-sidebar-backdrop.show { display: block; position: fixed; inset: 0; background: rgba(11,15,20,0.5); z-index: 40; }
  .oc-mobile-menu-btn { display: flex !important; }
  .oc-desktop-collapse-btn { display: none !important; }
  .oc-sidebar-close { display: flex !important; }
}
@media (max-width: 860px) {
  .oc-dash-grid, .oc-chat-grid { grid-template-columns: 1fr !important; }
  .oc-content-pad { padding: 16px !important; }
}
`;

/* ============================================================================
   SHARED / NAV STRINGS
   ============================================================================ */
const commonText = {
  en: {
    appName: "OmniCore AI", tagline: "Enterprise Multimodal AI Operating System",
    search: "Search OmniCore…", loading: "Loading…", send: "Send", cancel: "Cancel",
    save: "Save", delete: "Delete", retry: "Retry", generate: "Generate insight",
    regenerate: "Regenerate", empty: "Nothing here yet", live: "Live",
    sample: "Sample data", poweredByClaude: "Powered by live Claude API calls",
    today: "Today", collapse: "Collapse sidebar", expand: "Expand sidebar",
    settings: "Settings", logout: "Log out", adminOnly: "Admin access required", checkingSession: "Checking your session…",
    adminOnlyDesc: "You're signed in as an Analyst. Security & Governance is restricted to Platform Admins.",
  },
  ar: {
    appName: "أومنيكور إيه آي", tagline: "نظام تشغيل ذكاء اصطناعي متعدد الوسائط للمؤسسات",
    search: "بحث في أومنيكور…", loading: "جارٍ التحميل…", send: "إرسال", cancel: "إلغاء",
    save: "حفظ", delete: "حذف", retry: "إعادة المحاولة", generate: "إنشاء رؤية تحليلية",
    regenerate: "إعادة الإنشاء", empty: "لا يوجد شيء هنا بعد", live: "مباشر",
    sample: "بيانات توضيحية", poweredByClaude: "مدعوم باستدعاءات مباشرة لواجهة Claude",
    today: "اليوم", collapse: "طي الشريط الجانبي", expand: "توسيع الشريط الجانبي",
    settings: "الإعدادات", logout: "تسجيل الخروج", adminOnly: "يتطلب صلاحية المسؤول", checkingSession: "جارٍ التحقق من جلستك…",
    adminOnlyDesc: "أنت مسجَّل الدخول كمحلّل. الأمان والحوكمة مقتصر على مسؤولي المنصة.",
  },
};

const NAV_ITEMS = [
  { key: "dashboard", icon: Home, en: "Executive Dashboard", ar: "لوحة القيادة التنفيذية", group: "overview" },
  { key: "chat", icon: MessageSquare, en: "AI Chat Assistant", ar: "مساعد الدردشة الذكي", group: "ai", live: true },
  { key: "documents", icon: FileText, en: "Document Intelligence", ar: "ذكاء المستندات", group: "ai", live: true },
  { key: "vision", icon: Camera, en: "Computer Vision", ar: "الرؤية الحاسوبية", group: "ai", live: true },
  { key: "speech", icon: Mic, en: "Speech AI", ar: "الذكاء الصوتي", group: "ai", live: true },
  { key: "agents", icon: Bot, en: "AI Agent Platform", ar: "منصة الوكلاء الأذكياء", group: "ai", live: true },
  { key: "analytics", icon: TrendingUp, en: "Predictive Analytics", ar: "التحليلات التنبؤية", group: "data", live: true },
  { key: "recommend", icon: Star, en: "Recommendation Engine", ar: "محرك التوصيات", group: "data" },
  { key: "search", icon: Search, en: "Enterprise Search", ar: "البحث المؤسسي", group: "data", live: true },
  { key: "trade", icon: Scale, en: "Trade & Regulatory", ar: "التجارة والتنظيم", group: "data", live: true },
  { key: "automation", icon: Workflow, en: "Automation Platform", ar: "منصة الأتمتة", group: "ops" },
  { key: "security", icon: Shield, en: "Security & Governance", ar: "الأمان والحوكمة", group: "ops", live: true },
  { key: "plugins", icon: PlugZap, en: "Integration Hub", ar: "مركز التكاملات", group: "ops" },
];

const GROUP_LABEL = {
  en: { overview: "Overview", ai: "AI Modules", data: "Data & Discovery", ops: "Operations" },
  ar: { overview: "نظرة عامة", ai: "وحدات الذكاء الاصطناعي", data: "البيانات والاكتشاف", ops: "العمليات" },
};

/* ============================================================================
   AI HELPER — calls our own FastAPI backend (POST /api/ai/complete), which
   holds the Anthropic API key server-side and proxies to Claude.

   NOTE: this file started life as a Claude.ai artifact, where a direct
   browser fetch to api.anthropic.com is transparently authenticated by the
   artifact runtime. Running standalone (this project), there is no such
   proxy — a direct browser call would have no credentials and would also
   expose an API key to anyone opening devtools if it did. So the very first
   thing this project changes is: this function now calls our own backend
   instead. Every module below (Chat, Documents, Vision, Speech, Agents,
   Dashboard insight) still just calls callClaude(...) exactly as before —
   only this one function's internals changed.
   ============================================================================ */
const API_BASE = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) || "http://localhost:8000";

/* ---------------------------------------------------------------------------
   ONE request layer for every backend call.

   QA found the same three defects repeated across separate fetch sites:
     1. Network failures surfaced as the browser's raw "Failed to fetch".
     2. FastAPI validation errors (`detail` is an ARRAY of objects) went straight
        into `new Error(...)` and rendered as the literal text "[object Object]".
     3. A 401 (expired token) was shown as an error banner while the user stayed
        "logged in" and every module kept failing.
   Fixing them once here, and routing callClaude / predictChurn / apiFetch /
   loginRequest through it, means no call site can regress them individually.

   The token is held at module level (set by the root component on login /
   session restore / logout) so callClaude and predictChurn — called from a
   dozen modules that never received a token prop — authenticate too. The
   backend now rejects anonymous calls to every non-auth route.
   --------------------------------------------------------------------------- */
let authToken = null;
let unauthorizedHandler = null;
const setAuthToken = (t) => { authToken = t; };
const setUnauthorizedHandler = (fn) => { unauthorizedHandler = fn; };

const NETWORK_ERROR = {
  en: "Can't reach the server. Check your connection and try again.",
  ar: "تعذّر الاتصال بالخادم. تحقّق من اتصالك وحاول مرة أخرى.",
};
const currentLang = () =>
  (typeof document !== "undefined" && document.documentElement.lang === "ar") ? "ar" : "en";

// FastAPI returns `detail` as a string for HTTPException, but as an array of
// {loc, msg, type} objects for request-validation failures (HTTP 422).
function messageFromDetail(body, fallback) {
  const d = body && body.detail;
  if (typeof d === "string" && d) return d;
  if (Array.isArray(d) && d.length) {
    return d.map((e) => {
      const field = Array.isArray(e.loc) ? e.loc.filter((x) => !["body", "query", "path"].includes(x)).join(".") : "";
      return field ? `${field}: ${e.msg}` : e.msg;
    }).join("; ");
  }
  return fallback;
}

async function apiRequest(path, { token, method = "GET", body, signal, failLabel = "Request failed" } = {}) {
  const t = token ?? authToken;
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal,
    });
  } catch (err) {
    if (err && err.name === "AbortError") throw err;   // callers own their timeout messaging
    throw new Error(NETWORK_ERROR[currentLang()]);
  }
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    // Only treat 401 as "session ended" when we actually sent a token — a wrong
    // password on the login form is also a 401 and must not log anyone out.
    if (res.status === 401 && t && unauthorizedHandler) unauthorizedHandler();
    throw new Error(messageFromDetail(detail, `${failLabel} (${res.status})`));
  }
  return res.status === 204 ? null : res.json();
}

async function callClaude({ system, messages, maxTokens = 1000, enableTools = false }) {
  const controller = new AbortController();
  // Slightly longer than the backend's own 180s Ollama timeout, so in the
  // normal case the backend's clearer, more specific error arrives first —
  // this is the backstop for cases that somehow bypass that (e.g. a truly
  // stuck connection), so the UI can never spin forever with zero feedback.
  const timeoutId = setTimeout(() => controller.abort(), 200_000);
  try {
    const data = await apiRequest("/api/ai/complete", {
      method: "POST",
      body: { system, messages, max_tokens: maxTokens, enable_tools: enableTools },
      signal: controller.signal,
      failLabel: "AI request failed",
    });
    return data.text || "";
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("No response after 200s. On CPU, a cold model load plus a long answer can be slow, "
        + "but this usually means something's stuck — check Docker Desktop's memory allocation (Settings → "
        + "Resources): qwen3:4b needs roughly 4-6GB available. Restarting the backend/ollama containers is the "
        + "quickest recovery if it's genuinely wedged.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Kept as the name the persisted modules already use.
const apiFetch = (path, opts = {}) => apiRequest(path, opts);

const predictChurn = (payload) =>
  apiRequest("/api/predict/churn", { method: "POST", body: payload, failLabel: "Prediction failed" });

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

/* ============================================================================
   SHARED UI PRIMITIVES
   ============================================================================ */
function Card({ children, className = "", padded = true, style }) {
  return (
    <div
      className={`oc-fade-up ${className}`}
      style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 16, padding: padded ? 20 : 0,
        boxShadow: "0 1px 2px rgba(15,17,20,0.04)", ...style,
      }}
    >
      {children}
    </div>
  );
}

function Badge({ tone = "neutral", children, icon: Icon }) {
  const tones = {
    neutral: { bg: "var(--surface-sunken)", fg: "var(--ink-soft)" },
    accent: { bg: "var(--accent-soft)", fg: "var(--accent)" },
    success: { bg: "var(--success-soft)", fg: "var(--success)" },
    danger: { bg: "var(--danger-soft)", fg: "var(--danger)" },
    spark: { bg: "var(--spark-soft)", fg: "var(--spark)" },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, background: t.bg, color: t.fg,
      fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 999, lineHeight: 1.5,
    }}>
      {Icon && <Icon size={12} />}
      {children}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, delta, deltaTone = "success", suffix }) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, background: "var(--accent-soft)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={17} color="var(--accent)" />
        </div>
        {delta && (
          <span style={{
            display: "flex", alignItems: "center", gap: 2, fontSize: 12, fontWeight: 600,
            color: deltaTone === "success" ? "var(--success)" : "var(--danger)",
          }}>
            {deltaTone === "success" ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {delta}
          </span>
        )}
      </div>
      <div className="oc-mono" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>
        {/* Numeric KPIs count up; anything non-numeric (an em-dash while a
            fetch is still in flight) renders as-is rather than animating
            toward NaN. The final figure is always the value passed in. */}
        {(() => {
          const n = Number(String(value).replace(/,/g, ""));
          if (value === "" || value === null || Number.isNaN(n)) return value;
          return <NumberTicker value={n} decimalPlaces={String(value).includes(".") ? 1 : 0} />;
        })()}
        {suffix && <span style={{ fontSize: 14, color: "var(--ink-faint)", marginInlineStart: 4 }}>{suffix}</span>}
      </div>
      <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 6 }}>{label}</div>
    </Card>
  );
}

function SectionHeader({ eyebrow, title, description, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
      <div>
        {eyebrow && <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{eyebrow}</div>}
        <h1 className="oc-display" style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{title}</h1>
        {description && <p style={{ fontSize: 14, color: "var(--ink-soft)", marginTop: 6, maxWidth: 640 }}>{description}</p>}
      </div>
      {action}
    </div>
  );
}

function Skeleton({ w = "100%", h = 14, r = 6 }) {
  return <div className="oc-skel" style={{ width: w, height: h, borderRadius: r }} />;
}

function PrimaryButton({ children, onClick, disabled, icon: Icon, type = "button", style }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className="oc-focusable"
      style={{
        display: "inline-flex", alignItems: "center", gap: 7, background: disabled ? "var(--border-strong)" : "var(--ink)",
        color: "#fff", border: "none", borderRadius: 10, padding: "9px 15px", fontSize: 13.5, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer", transition: "opacity 0.15s", ...style,
      }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.opacity = "0.85")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

function GhostButton({ children, onClick, icon: Icon, active, style }) {
  return (
    <button onClick={onClick} className="oc-focusable" style={{
      display: "inline-flex", alignItems: "center", gap: 6, background: active ? "var(--surface-sunken)" : "transparent",
      color: "var(--ink)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 13px",
      fontSize: 13.5, fontWeight: 600, cursor: "pointer", ...style,
    }}>
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

/* The signature element: a persistent AI-generated insight surface.
   Amber spark = "the platform reasoned about this for you", used nowhere else. */
function AIInsightPanel({ lang, loading, text, onRegenerate, label }) {
  const t = commonText[lang];
  return (
    <Card className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, var(--spark-soft), var(--surface))", borderColor: "#EFDCB0" }}>
      {/* Beam only while the model is actually working — it reads as "thinking",
          so leaving it running on a finished answer would be a false signal. */}
      {loading && <BorderBeam size={160} duration={6} colorFrom="#B8790C" colorTo="#EFDCB0" />}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, background: "var(--spark)", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1,
        }}>
          <Sparkles size={16} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <Badge tone="spark" icon={Sparkles}>{label || (lang === "ar" ? "رؤية الذكاء الاصطناعي" : "AI insight")}</Badge>
            <button onClick={onRegenerate} disabled={loading} className="oc-focusable" title={t.regenerate}
              style={{ background: "none", border: "none", cursor: loading ? "default" : "pointer", color: "var(--spark)", display: "flex" }}>
              <RefreshCw size={14} className={loading ? "oc-pulse-dot" : ""} />
            </button>
          </div>
          <div style={{ marginTop: 8, fontSize: 14.5, lineHeight: 1.55, color: "var(--ink)" }}>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Skeleton w="95%" /><Skeleton w="80%" /><Skeleton w="60%" />
              </div>
            ) : text || (lang === "ar" ? "انقر على تحديث لإنشاء رؤية جديدة." : "Click refresh to generate an insight.")}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ModuleShell({ children }) {
  return <div style={{ maxWidth: 1180 }}>{children}</div>;
}

/* ============================================================================
   MODULE: EXECUTIVE DASHBOARD
   ============================================================================ */
const dashboardText = {
  en: { eyebrow: "Home", title: "Executive Dashboard", desc: "A single view of platform health, usage, and what the AI layer is noticing right now.",
    kpis: { docs: "Documents analyzed", chats: "AI conversations", accuracy: "Churn model ROC-AUC", automations: "Active automations", images: "Images analyzed" },
    trendTitle: "Platform activity — last 14 days", trendDesc: "Real daily event counts from your persisted activity log",
    driversTitle: "Top churn signal (real model)", driversDesc: "From the trained Predictive Analytics model — see that module for full evaluation",
    activityTitle: "Recent activity", activityDesc: "Live log of actions taken in this session", noActivity: "Nothing logged yet — try the Chat Assistant or Document Intelligence.",
  },
  ar: { eyebrow: "الرئيسية", title: "لوحة القيادة التنفيذية", desc: "نظرة واحدة على صحة المنصة واستخدامها وما تلاحظه طبقة الذكاء الاصطناعي الآن.",
    kpis: { docs: "المستندات المُحلَّلة", chats: "محادثات الذكاء الاصطناعي", accuracy: "دقة نموذج تسرّب العملاء (ROC-AUC)", automations: "الأتمتة النشطة", images: "الصور المُحلَّلة" },
    trendTitle: "نشاط المنصة — آخر 14 يومًا", trendDesc: "أعداد يومية حقيقية من سجل نشاطك المحفوظ",
    driversTitle: "أهم مؤشر تسرّب (نموذج حقيقي)", driversDesc: "من نموذج التحليلات التنبؤية المُدرَّب — راجع تلك الوحدة للتقييم الكامل",
    activityTitle: "النشاط الأخير", activityDesc: "سجل مباشر للإجراءات المتخذة في هذه الجلسة", noActivity: "لم يُسجَّل شيء بعد — جرّب مساعد الدردشة أو ذكاء المستندات.",
  },
};

function ExecutiveDashboard({ lang, knowledgeBase, chatMessages, imageAnalysesCount, activityLog, churnMetrics, featureImportance, onOpenModule, token }) {
  const t = dashboardText[lang];
  const c = commonText[lang];
  const [insight, setInsight] = useState("");
  const [loadingInsight, setLoadingInsight] = useState(false);
  // Real daily counts from persisted activity_events, replacing what used to
  // be a hardcoded 14-point array. A new install legitimately shows a flat
  // line — that is what "nobody has used this yet" actually looks like.
  const [trend, setTrend] = useState([]);
  const [automationCount, setAutomationCount] = useState(null);

  useEffect(() => {
    apiFetch("/api/workspace/trend?days=14", { token })
      .then((rows) => setTrend(rows.map((r) => ({ ...r, label: r.d.slice(5) }))))
      .catch(() => setTrend([]));
    apiFetch("/api/workspace/automations", { token })
      .then((rows) => setAutomationCount(rows.filter((a) => a.enabled).length))
      .catch(() => setAutomationCount(null));
  }, [token, activityLog.length]);

  const generateInsight = useCallback(async () => {
    setLoadingInsight(true);
    try {
      const stats = `Documents analyzed: ${knowledgeBase.length}, AI chat turns: ${chatMessages.length}, images analyzed: ${imageAnalysesCount}, churn model ROC-AUC: ${churnMetrics?.roc_auc ?? "n/a"}, top churn driver: ${featureImportance?.[0]?.feature ?? "n/a"}.`;
      const text = await callClaude({
        system: lang === "ar"
          ? "أنت طبقة الذكاء الاصطناعي التنفيذية في نظام OmniCore AI. اكتب رؤية تنفيذية موجزة (2-3 جمل) بالعربية الفصحى بناءً على إحصاءات الجلسة المعطاة. كن ملموسًا ومفيدًا لصانع قرار، وتجنب الحشو."
          : "You are the executive AI layer of OmniCore AI, an enterprise platform. Write a concise 2-3 sentence executive insight based on the given session stats. Be concrete and useful to a decision-maker, no filler, no markdown.",
        messages: [{ role: "user", content: stats }],
        maxTokens: 220,
      });
      setInsight(text.trim());
    } catch (e) {
      setInsight((lang === "ar" ? "تعذّر إنشاء الرؤية: " : "Couldn't generate an insight: ") + e.message);
    } finally {
      setLoadingInsight(false);
    }
  }, [lang, knowledgeBase.length, chatMessages.length, imageAnalysesCount, churnMetrics, featureImportance]);

  useEffect(() => { generateInsight(); /* eslint-disable-next-line */ }, [lang]);

  const kpis = [
    { icon: FileText, label: t.kpis.docs, value: String(knowledgeBase.length), onClick: () => onOpenModule("documents") },
    { icon: MessageSquare, label: t.kpis.chats, value: String(chatMessages.length), onClick: () => onOpenModule("chat") },
    { icon: ImageIcon, label: t.kpis.images, value: String(imageAnalysesCount), onClick: () => onOpenModule("vision") },
    { icon: TrendingUp, label: t.kpis.accuracy, value: churnMetrics ? (churnMetrics.roc_auc * 100).toFixed(1) : "—", suffix: "%", onClick: () => onOpenModule("analytics") },
    { icon: Workflow, label: t.kpis.automations,
      value: automationCount === null ? "—" : String(automationCount),
      onClick: () => onOpenModule("automation") },
  ];

  return (
    <ModuleShell>
      <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc} />
      <AIInsightPanel lang={lang} loading={loadingInsight} text={insight} onRegenerate={generateInsight} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, margin: "18px 0" }}>
        {kpis.map((k, i) => (
          <div key={i} onClick={k.onClick} style={{ cursor: "pointer" }}>
            <StatCard icon={k.icon} label={k.label} value={k.value} suffix={k.suffix} />
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, alignItems: "stretch" }} className="oc-dash-grid">
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 2 }}>{t.trendTitle}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 10 }}>{t.trendDesc}</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trend} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="ocArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0C8479" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#0C8479" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#ECECE8" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#93968E" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#93968E" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #E4E4E0" }} />
              <Area type="monotone" dataKey="v" stroke="#0C8479" strokeWidth={2} fill="url(#ocArea)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 2 }}>{t.driversTitle}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 10 }}>{t.driversDesc}</div>
          {featureImportance ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {featureImportance.slice(0, 5).map((f, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: "var(--ink-soft)" }}>{f.feature}</span>
                    <span className="oc-mono" style={{ fontWeight: 600 }}>{(f.importance * 100).toFixed(1)}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 4, background: "var(--surface-sunken)" }}>
                    <div style={{ height: "100%", borderRadius: 4, background: "var(--accent)", width: `${Math.min(100, f.importance * 400)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <Skeleton h={140} />}
        </Card>
      </div>
      <div style={{ marginTop: 14 }}>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 2 }}>{t.activityTitle}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 10 }}>{t.activityDesc}</div>
          {activityLog.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--ink-faint)", padding: "10px 0" }}>{t.noActivity}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {activityLog.slice(0, 6).map((a) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <CircleDot size={13} color="var(--accent)" />
                  <span style={{ fontSize: 13, flex: 1 }}>{a.text}</span>
                  <span className="oc-mono" style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{a.time}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </ModuleShell>
  );
}

/* ============================================================================
   MODULE: AI CHAT ASSISTANT — live Claude calls + simple in-memory RAG
   ============================================================================ */
const chatText = {
  en: { eyebrow: "Module 01", title: "AI Chat Assistant", desc: "Grounded in the knowledge snippets on the right, plus real web search when the question needs current information.",
    kbTitle: "Knowledge base", kbDesc: "Add text the assistant should ground its answers in", kbPlaceholder: "Paste a policy, FAQ, or doc excerpt…",
    kbAdd: "Add snippet", kbEmpty: "No snippets yet. The assistant will answer from general knowledge until you add some.",
    inputPlaceholder: "Ask about your knowledge base, or anything else…", thinking: "Thinking",
    thinkingSlow: "Still working — self-hosted CPU inference can take a while, especially right after startup",
    welcomeMsg: "Hi — I'm the OmniCore assistant. Add a few knowledge snippets on the right, then ask me anything about them.",
  },
  ar: { eyebrow: "الوحدة ٠١", title: "مساعد الدردشة الذكي", desc: "مستند إلى المقتطفات المعرفية على اليمين، بالإضافة إلى بحث ويب حقيقي عند حاجة السؤال لمعلومات حالية.",
    kbTitle: "قاعدة المعرفة", kbDesc: "أضف نصًا ليستند إليه المساعد في إجاباته", kbPlaceholder: "الصق سياسة أو أسئلة شائعة أو مقتطف مستند…",
    kbAdd: "إضافة مقتطف", kbEmpty: "لا توجد مقتطفات بعد. سيجيب المساعد من معرفته العامة حتى تضيف بعضها.",
    inputPlaceholder: "اسأل عن قاعدة المعرفة أو أي شيء آخر…", thinking: "يفكّر",
    thinkingSlow: "لا يزال يعمل — الاستدلال الذاتي الاستضافة على المعالج قد يستغرق وقتًا، خصوصًا بعد بدء التشغيل مباشرة",
    welcomeMsg: "مرحبًا — أنا مساعد أومنيكور. أضف بعض المقتطفات المعرفية على اليمين، ثم اسألني عنها.",
  },
};

function AIChatAssistant({ lang, knowledgeBase, setKnowledgeBase, chatMessages, setChatMessages, logActivity }) {
  const t = chatText[lang];
  const c = commonText[lang];
  const [input, setInput] = useState("");
  const [newSnippet, setNewSnippet] = useState("");
  const [sending, setSending] = useState(false);
  const [slowWait, setSlowWait] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [chatMessages, sending]);

  useEffect(() => {
    if (!sending) { setSlowWait(false); return; }
    const id = setTimeout(() => setSlowWait(true), 12_000);
    return () => clearTimeout(id);
  }, [sending]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const userMsg = { role: "user", content: input.trim() };
    const nextMessages = [...chatMessages, userMsg];
    setChatMessages(nextMessages);
    setInput("");
    setSending(true);
    try {
      const kbText = knowledgeBase.length
        ? knowledgeBase.map((k, i) => `[Snippet ${i + 1}: ${k.title}]\n${k.content}`).join("\n\n")
        : "";
      const system = (lang === "ar"
        ? "أنت مساعد أومنيكور للمؤسسات. أجب بالعربية بإيجاز ودقة. إن كانت الإجابة مستندة إلى أحد المقتطفات، اذكر اسمه بين قوسين في نهاية الجملة. لديك أداة بحث في الويب — استخدمها لأي سؤال عن معلومات حالية أو أخبار أو أسعار أو أي شيء قد يكون تغيّر."
        : "You are the OmniCore enterprise assistant. Answer concisely and accurately. If your answer draws on a specific snippet, name it in parentheses at the end of the relevant sentence. You have a web search tool — use it for any question about current events, news, prices, or anything that may have changed since training.")
        + (kbText ? `\n\nKnowledge base:\n${kbText}` : "\n\nNo knowledge base snippets have been added yet — answer from general knowledge and mention that adding snippets would ground future answers.");
      const reply = await callClaude({
        system,
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        maxTokens: 700,
        enableTools: true,
      });
      setChatMessages([...nextMessages, { role: "assistant", content: reply }]);
      logActivity(lang === "ar" ? "أرسل رسالة إلى مساعد الدردشة" : "Sent a message to the Chat Assistant");
    } catch (e) {
      setChatMessages([...nextMessages, { role: "assistant", content: (lang === "ar" ? "خطأ: " : "Error: ") + e.message }]);
    } finally {
      setSending(false);
    }
  };

  const addSnippet = () => {
    if (!newSnippet.trim()) return;
    const title = newSnippet.trim().split("\n")[0].slice(0, 42) || `Snippet ${knowledgeBase.length + 1}`;
    setKnowledgeBase([...knowledgeBase, { id: Date.now(), title, content: newSnippet.trim(), source: "chat" }]);
    setNewSnippet("");
    logActivity(lang === "ar" ? `أضاف مقتطفًا معرفيًا: ${title}` : `Added knowledge snippet: ${title}`);
  };

  return (
    <ModuleShell>
      <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc}
        action={<Badge tone="accent" icon={CheckCircle2}>{c.live}</Badge>} />
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14 }} className="oc-chat-grid">
        <Card padded={false} style={{ display: "flex", flexDirection: "column", height: 560 }}>
          <div ref={scrollRef} className="oc-scroll" style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <ChatBubble role="assistant" content={t.welcomeMsg} lang={lang} />
            {chatMessages.map((m, i) => <ChatBubble key={i} role={m.role} content={m.content} lang={lang} />)}
            {sending && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink-faint)", fontSize: 13 }}>
                <Loader2 size={14} className="oc-pulse-dot" /> {slowWait ? t.thinkingSlow : `${t.thinking}…`}
              </div>
            )}
          </div>
          <div style={{ borderTop: "1px solid var(--border)", padding: 12, display: "flex", gap: 8 }}>
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={t.inputPlaceholder} className="oc-focusable"
              style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 10, padding: "10px 13px", fontSize: 14, background: "var(--surface-sunken)" }} />
            <PrimaryButton onClick={send} disabled={sending || !input.trim()} icon={Send}>{c.send}</PrimaryButton>
          </div>
        </Card>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5 }}>{t.kbTitle}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 10 }}>{t.kbDesc}</div>
          <textarea value={newSnippet} onChange={(e) => setNewSnippet(e.target.value)} placeholder={t.kbPlaceholder}
            rows={3} className="oc-focusable"
            style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 10, padding: 10, fontSize: 13, resize: "vertical", background: "var(--surface-sunken)" }} />
          <div style={{ marginTop: 8 }}>
            <GhostButton onClick={addSnippet} icon={Plus}>{t.kbAdd}</GhostButton>
          </div>
          <div className="oc-scroll" style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8, maxHeight: 340, overflowY: "auto" }}>
            {knowledgeBase.length === 0 && <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>{t.kbEmpty}</div>}
            {knowledgeBase.map((k) => (
              <div key={k.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px", background: "var(--surface-sunken)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{k.title}</span>
                  <button onClick={() => setKnowledgeBase(knowledgeBase.filter((x) => x.id !== k.id))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-faint)" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 2 }}>{k.content.length} chars · {k.source}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </ModuleShell>
  );
}

function ChatBubble({ role, content, lang }) {
  const isUser = role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
      <div style={{
        maxWidth: "80%", background: isUser ? "var(--ink)" : "var(--surface-sunken)",
        color: isUser ? "#fff" : "var(--ink)", padding: "10px 14px", borderRadius: 14,
        borderBottomRightRadius: isUser ? 4 : 14, borderBottomLeftRadius: isUser ? 14 : 4,
        fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap",
      }}>
        {content}
      </div>
    </div>
  );
}

/* ============================================================================
   MODULE: DOCUMENT INTELLIGENCE — upload/paste, live Claude analysis
   ============================================================================ */
const documentsText = {
  en: { eyebrow: "Module 03", title: "Document Intelligence", desc: "Upload a document image or paste text. Claude reads it, summarizes it, and can answer follow-up questions.",
    dropTitle: "Drop a file or click to upload", dropSub: "Images (PNG/JPG) or paste text below", or: "or paste text",
    pastePlaceholder: "Paste document text here…", analyze: "Analyze document", analyzing: "Reading document…",
    summary: "Summary", keyPoints: "Key points", addToKb: "Add to knowledge base", added: "Added to knowledge base",
    askPlaceholder: "Ask a question about this document…", ask: "Ask",
  },
  ar: { eyebrow: "الوحدة ٠٣", title: "ذكاء المستندات", desc: "ارفع صورة مستند أو الصق نصًا. يقرأه Claude ويلخّصه ويمكنه الإجابة عن أسئلة إضافية.",
    dropTitle: "اسحب ملفًا هنا أو انقر للرفع", dropSub: "صور (PNG/JPG) أو الصق نصًا أدناه", or: "أو الصق نصًا",
    pastePlaceholder: "الصق نص المستند هنا…", analyze: "تحليل المستند", analyzing: "جارٍ قراءة المستند…",
    summary: "الملخص", keyPoints: "النقاط الرئيسية", addToKb: "إضافة إلى قاعدة المعرفة", added: "أُضيف إلى قاعدة المعرفة",
    askPlaceholder: "اطرح سؤالاً عن هذا المستند…", ask: "اسأل",
  },
};

function DocumentIntelligence({ lang, knowledgeBase, setKnowledgeBase, logActivity }) {
  const t = documentsText[lang];
  const c = commonText[lang];
  const fileRef = useRef(null);
  const [pastedText, setPastedText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageMime, setImageMime] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [added, setAdded] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [askingFollowUp, setAskingFollowUp] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setImageMime(file.type || "image/png");
    setImageBase64(await fileToBase64(file));
    setPastedText("");
    setResult(null); setAdded(false); setFollowUpAnswer("");
  };

  const analyze = async () => {
    if (!imageBase64 && !pastedText.trim()) return;
    setAnalyzing(true); setResult(null); setAdded(false); setFollowUpAnswer("");
    try {
      const instruction = lang === "ar"
        ? "حلّل هذا المستند. أعد الرد بصيغة JSON فقط بالمفاتيح التالية: summary (فقرة من 2-3 جمل)، key_points (مصفوفة من 3-5 نقاط نصية قصيرة). لا تكتب أي شيء خارج JSON."
        : "Analyze this document. Reply with JSON only, keys: summary (2-3 sentence paragraph), key_points (array of 3-5 short strings). Nothing outside the JSON.";
      let content;
      if (imageBase64) {
        content = [
          { type: "image", source: { type: "base64", media_type: imageMime, data: imageBase64 } },
          { type: "text", text: instruction },
        ];
      } else {
        content = `${instruction}\n\nDocument text:\n${pastedText}`;
      }
      const raw = await callClaude({ system: "You are a precise document analysis engine. Output valid JSON only, no markdown fences.", messages: [{ role: "user", content }], maxTokens: 600 });
      const cleaned = raw.replace(/```json|```/g, "").trim();
      let parsed;
      try { parsed = JSON.parse(cleaned); } catch { parsed = { summary: cleaned, key_points: [] }; }
      setResult(parsed);
      logActivity(lang === "ar" ? "حلّل مستندًا" : "Analyzed a document");
    } catch (e) {
      setResult({ summary: (lang === "ar" ? "خطأ: " : "Error: ") + e.message, key_points: [] });
    } finally {
      setAnalyzing(false);
    }
  };

  const addToKb = () => {
    const title = (pastedText || "Uploaded image document").slice(0, 42);
    setKnowledgeBase([...knowledgeBase, { id: Date.now(), title, content: pastedText || result.summary, source: "documents" }]);
    setAdded(true);
    logActivity(lang === "ar" ? `أضاف مستندًا إلى قاعدة المعرفة: ${title}` : `Added document to knowledge base: ${title}`);
  };

  const askFollowUp = async () => {
    if (!followUp.trim()) return;
    setAskingFollowUp(true);
    try {
      const instruction = `${followUp}\n\n(Answer using only the document below.)`;
      let content;
      if (imageBase64) {
        content = [{ type: "image", source: { type: "base64", media_type: imageMime, data: imageBase64 } }, { type: "text", text: instruction }];
      } else {
        content = `Document:\n${pastedText}\n\nQuestion: ${followUp}`;
      }
      const answer = await callClaude({ system: "Answer briefly and only from the provided document.", messages: [{ role: "user", content }], maxTokens: 400 });
      setFollowUpAnswer(answer);
    } finally {
      setAskingFollowUp(false);
    }
  };

  return (
    <ModuleShell>
      <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc} action={<Badge tone="accent" icon={CheckCircle2}>{c.live}</Badge>} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="oc-chat-grid">
        <Card>
          <div onClick={() => fileRef.current?.click()} style={{
            border: "2px dashed var(--border-strong)", borderRadius: 12, padding: 26, textAlign: "center", cursor: "pointer", background: "var(--surface-sunken)",
          }}>
            {imagePreview ? (
              <img src={imagePreview} alt="preview" style={{ maxHeight: 160, borderRadius: 8, margin: "0 auto" }} />
            ) : (
              <>
                <Upload size={22} color="var(--ink-faint)" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.dropTitle}</div>
                <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 3 }}>{t.dropSub}</div>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
          <div style={{ fontSize: 12, color: "var(--ink-faint)", margin: "12px 0 6px" }}>{t.or}</div>
          <textarea value={pastedText} onChange={(e) => { setPastedText(e.target.value); setImagePreview(null); setImageBase64(null); }}
            placeholder={t.pastePlaceholder} rows={5} className="oc-focusable"
            style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 10, padding: 10, fontSize: 13, background: "var(--surface-sunken)" }} />
          <div style={{ marginTop: 10 }}>
            <PrimaryButton onClick={analyze} disabled={analyzing || (!imageBase64 && !pastedText.trim())} icon={analyzing ? Loader2 : Sparkles}>
              {analyzing ? t.analyzing : t.analyze}
            </PrimaryButton>
          </div>
        </Card>
        <Card>
          {!result && !analyzing && <div style={{ fontSize: 13, color: "var(--ink-faint)" }}>{c.empty}</div>}
          {analyzing && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><Skeleton w="90%" /><Skeleton w="70%" /><Skeleton w="80%" /></div>}
          {result && (
            <>
              <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>{t.summary}</div>
              <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ink)" }}>{result.summary}</p>
              {result.key_points?.length > 0 && (
                <>
                  <div style={{ fontWeight: 700, fontSize: 13.5, margin: "12px 0 6px" }}>{t.keyPoints}</div>
                  <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 13, lineHeight: 1.7 }}>
                    {result.key_points.map((k, i) => <li key={i}>{k}</li>)}
                  </ul>
                </>
              )}
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <GhostButton onClick={addToKb} icon={added ? CheckCircle2 : BookMarked}>{added ? t.added : t.addToKb}</GhostButton>
              </div>
              <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={followUp} onChange={(e) => setFollowUp(e.target.value)} onKeyDown={(e) => e.key === "Enter" && askFollowUp()}
                    placeholder={t.askPlaceholder} className="oc-focusable"
                    style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px", fontSize: 13, background: "var(--surface-sunken)" }} />
                  <GhostButton onClick={askFollowUp} icon={askingFollowUp ? Loader2 : Send}>{t.ask}</GhostButton>
                </div>
                {followUpAnswer && <p style={{ fontSize: 13, marginTop: 10, lineHeight: 1.55 }}>{followUpAnswer}</p>}
              </div>
            </>
          )}
        </Card>
      </div>
    </ModuleShell>
  );
}

/* ============================================================================
   MODULE: COMPUTER VISION — live Claude vision analysis
   ============================================================================ */
const visionText = {
  en: { eyebrow: "Module 02", title: "Computer Vision Platform", desc: "Upload an image for AI-powered scene analysis: objects, on-image text, and notable observations.",
    upload: "Upload an image", analyze: "Analyze image", analyzing: "Analyzing image…",
    scene: "Scene description", objects: "Objects detected", text: "Text found in image", notes: "Notable observations",
    note: "Free-form visual understanding via Claude's vision — not pixel-level bounding boxes like a dedicated YOLO/SAM pipeline.",
  },
  ar: { eyebrow: "الوحدة ٠٢", title: "منصة الرؤية الحاسوبية", desc: "ارفع صورة لتحليل المشهد بالذكاء الاصطناعي: الأجسام والنص داخل الصورة والملاحظات المهمة.",
    upload: "ارفع صورة", analyze: "تحليل الصورة", analyzing: "جارٍ تحليل الصورة…",
    scene: "وصف المشهد", objects: "الأجسام المكتشفة", text: "النص الموجود في الصورة", notes: "ملاحظات مهمة",
    note: "فهم بصري حر عبر رؤية Claude — وليس صناديق تحديد على مستوى البكسل كخط أنابيب YOLO/SAM مخصص.",
  },
};

function ComputerVisionPlatform({ lang, logActivity, onAnalyzed }) {
  const t = visionText[lang];
  const c = commonText[lang];
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [b64, setB64] = useState(null);
  const [mime, setMime] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const handleFile = async (file) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setMime(file.type || "image/png");
    setB64(await fileToBase64(file));
    setResult(null);
  };

  const analyze = async () => {
    if (!b64) return;
    setAnalyzing(true); setResult(null);
    try {
      const instruction = lang === "ar"
        ? "حلّل هذه الصورة لمنصة رؤية حاسوبية للمؤسسات. أعد JSON فقط بالمفاتيح: scene (وصف من جملتين)، objects (مصفوفة نصية لأهم 5-8 أجسام أو عناصر ملحوظة)، text_found (أي نص مقروء في الصورة، أو مصفوفة فارغة)، notes (مصفوفة من 2-3 ملاحظات مهنية). لا نص خارج JSON."
        : "Analyze this image for an enterprise computer-vision platform. Reply with JSON only, keys: scene (two-sentence description), objects (array of the 5-8 most notable objects/elements as short strings), text_found (any readable text in the image, or empty array), notes (array of 2-3 professional observations, e.g. quality, composition, anomalies). Nothing outside the JSON.";
      const raw = await callClaude({
        system: "You are a precise computer-vision analysis engine. Output valid JSON only, no markdown fences.",
        messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mime, data: b64 } }, { type: "text", text: instruction }] }],
        maxTokens: 500,
      });
      const cleaned = raw.replace(/```json|```/g, "").trim();
      let parsed;
      try { parsed = JSON.parse(cleaned); } catch { parsed = { scene: cleaned, objects: [], text_found: [], notes: [] }; }
      setResult(parsed);
      logActivity(lang === "ar" ? "حلّل صورة عبر الرؤية الحاسوبية" : "Analyzed an image via Computer Vision");
      onAnalyzed?.();
    } catch (e) {
      setResult({ scene: (lang === "ar" ? "خطأ: " : "Error: ") + e.message, objects: [], text_found: [], notes: [] });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <ModuleShell>
      <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc} action={<Badge tone="accent" icon={CheckCircle2}>{c.live}</Badge>} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="oc-chat-grid">
        <Card>
          <div onClick={() => fileRef.current?.click()} style={{
            border: "2px dashed var(--border-strong)", borderRadius: 12, padding: 26, textAlign: "center", cursor: "pointer", background: "var(--surface-sunken)", minHeight: 180,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}>
            {preview ? <img src={preview} alt="preview" style={{ maxHeight: 200, borderRadius: 8 }} /> : (
              <>
                <Camera size={22} color="var(--ink-faint)" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.upload}</div>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
          <div style={{ marginTop: 10 }}>
            <PrimaryButton onClick={analyze} disabled={!b64 || analyzing} icon={analyzing ? Loader2 : Sparkles}>{analyzing ? t.analyzing : t.analyze}</PrimaryButton>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 10, lineHeight: 1.5 }}>{t.note}</div>
        </Card>
        <Card>
          {!result && !analyzing && <div style={{ fontSize: 13, color: "var(--ink-faint)" }}>{c.empty}</div>}
          {analyzing && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><Skeleton w="90%" /><Skeleton w="70%" /><Skeleton w="80%" /></div>}
          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>{t.scene}</div>
                <p style={{ fontSize: 13.5, lineHeight: 1.55 }}>{result.scene}</p>
              </div>
              {result.objects?.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 6 }}>{t.objects}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {result.objects.map((o, i) => <Badge key={i}>{o}</Badge>)}
                  </div>
                </div>
              )}
              {result.text_found?.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>{t.text}</div>
                  <div className="oc-mono" style={{ fontSize: 12.5, background: "var(--surface-sunken)", borderRadius: 8, padding: 8 }}>
                    {result.text_found.join(" · ")}
                  </div>
                </div>
              )}
              {result.notes?.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>{t.notes}</div>
                  <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 13, lineHeight: 1.7 }}>
                    {result.notes.map((n, i) => <li key={i}>{n}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </ModuleShell>
  );
}

/* ============================================================================
   MODULE: SPEECH AI — real browser speech recognition + speech synthesis,
   plus live Claude summarization of the transcript.
   ============================================================================ */
const speechText = {
  en: { eyebrow: "Module 04", title: "Speech AI", desc: "Live microphone transcription and text-to-speech, both running in your browser, plus an AI meeting summary.",
    unsupported: "Speech recognition isn't available in this browser. Try Chrome/Edge on desktop, or paste a transcript below.",
    start: "Start recording", stop: "Stop", transcript: "Live transcript", transcriptEmpty: "Your words will appear here as you speak.",
    summarize: "Summarize with AI", summarizing: "Summarizing…", summaryTitle: "Meeting summary", actionItems: "Action items",
    ttsTitle: "Text-to-speech", ttsPlaceholder: "Type something for OmniCore to read aloud…", speak: "Speak", stopSpeak: "Stop",
    pasteInstead: "Or paste a transcript",
  },
  ar: { eyebrow: "الوحدة ٠٤", title: "الذكاء الصوتي", desc: "تفريغ صوتي مباشر من الميكروفون وتحويل نص إلى كلام، يعملان في متصفحك، مع ملخص اجتماع بالذكاء الاصطناعي.",
    unsupported: "التعرف على الصوت غير متاح في هذا المتصفح. جرّب Chrome/Edge على سطح المكتب، أو الصق نصًا أدناه.",
    start: "بدء التسجيل", stop: "إيقاف", transcript: "النص المباشر", transcriptEmpty: "ستظهر كلماتك هنا أثناء الحديث.",
    summarize: "تلخيص بالذكاء الاصطناعي", summarizing: "جارٍ التلخيص…", summaryTitle: "ملخص الاجتماع", actionItems: "بنود العمل",
    ttsTitle: "تحويل النص إلى كلام", ttsPlaceholder: "اكتب شيئًا ليقرأه أومنيكور بصوت عالٍ…", speak: "نطق", stopSpeak: "إيقاف",
    pasteInstead: "أو الصق نصًا مفرّغًا",
  },
};

function SpeechAI({ lang, logActivity }) {
  const t = speechText[lang];
  const c = commonText[lang];
  const [supported, setSupported] = useState(true);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState(null);
  const [summarizing, setSummarizing] = useState(false);
  const [ttsText, setTtsText] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang === "ar" ? "ar-SA" : "en-US";
    rec.onresult = (e) => {
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + " ";
      }
      if (finalText) setTranscript((prev) => (prev + " " + finalText).trim());
    };
    rec.onerror = () => setRecording(false);
    rec.onend = () => setRecording(false);
    recognitionRef.current = rec;
    return () => { try { rec.stop(); } catch (e) {} };
  }, [lang]);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (recording) {
      recognitionRef.current.stop();
      setRecording(false);
      logActivity(lang === "ar" ? "أوقف تسجيل الصوت" : "Stopped a voice recording");
    } else {
      try {
        recognitionRef.current.start();
        setRecording(true);
        logActivity(lang === "ar" ? "بدأ تسجيل الصوت" : "Started a voice recording");
      } catch (e) {}
    }
  };

  const summarize = async () => {
    if (!transcript.trim()) return;
    setSummarizing(true); setSummary(null);
    try {
      const instruction = lang === "ar"
        ? "لخّص محضر الاجتماع هذا. أعد JSON فقط بالمفتاحين: summary (فقرة موجزة)، action_items (مصفوفة من 2-5 بنود عمل قصيرة). لا نص خارج JSON."
        : "Summarize this meeting transcript. Reply with JSON only, keys: summary (short paragraph), action_items (array of 2-5 short action items). Nothing outside the JSON.";
      const raw = await callClaude({ system: "You are a precise meeting-notes engine. Output valid JSON only.", messages: [{ role: "user", content: `${instruction}\n\nTranscript:\n${transcript}` }], maxTokens: 500 });
      const cleaned = raw.replace(/```json|```/g, "").trim();
      let parsed;
      try { parsed = JSON.parse(cleaned); } catch { parsed = { summary: cleaned, action_items: [] }; }
      setSummary(parsed);
      logActivity(lang === "ar" ? "لخّص محضر اجتماع" : "Summarized a meeting transcript");
    } finally {
      setSummarizing(false);
    }
  };

  const speak = () => {
    if (!ttsText.trim() || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(ttsText);
    utter.lang = lang === "ar" ? "ar-SA" : "en-US";
    utter.onend = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  };
  const stopSpeak = () => { window.speechSynthesis?.cancel(); setSpeaking(false); };

  return (
    <ModuleShell>
      <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc} action={<Badge tone="accent" icon={CheckCircle2}>{c.live}</Badge>} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="oc-chat-grid">
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 10 }}>{t.transcript}</div>
          {!supported && <div style={{ fontSize: 12.5, color: "var(--danger)", background: "var(--danger-soft)", padding: 10, borderRadius: 8, marginBottom: 10 }}>{t.unsupported}</div>}
          {supported && (
            <div style={{ marginBottom: 12 }}>
              <button onClick={toggleRecording} className="oc-focusable" style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, border: "none",
                background: recording ? "var(--danger)" : "var(--ink)", color: "#fff", fontWeight: 600, fontSize: 13.5, cursor: "pointer",
              }}>
                {recording ? <StopCircle size={16} /> : <Mic size={16} />}
                {recording ? t.stop : t.start}
                {recording && <span className="oc-pulse-dot" style={{ width: 7, height: 7, borderRadius: 99, background: "#fff", marginInlineStart: 2 }} />}
              </button>
            </div>
          )}
          <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder={supported ? t.transcriptEmpty : t.pasteInstead}
            rows={8} className="oc-focusable oc-scroll"
            style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 10, padding: 10, fontSize: 13.5, background: "var(--surface-sunken)", lineHeight: 1.6 }} />
          <div style={{ marginTop: 10 }}>
            <PrimaryButton onClick={summarize} disabled={!transcript.trim() || summarizing} icon={summarizing ? Loader2 : Sparkles}>
              {summarizing ? t.summarizing : t.summarize}
            </PrimaryButton>
          </div>
          {summary && (
            <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>{t.summaryTitle}</div>
              <p style={{ fontSize: 13.5, lineHeight: 1.55 }}>{summary.summary}</p>
              {summary.action_items?.length > 0 && (
                <>
                  <div style={{ fontWeight: 700, fontSize: 13.5, margin: "10px 0 4px" }}>{t.actionItems}</div>
                  <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 13, lineHeight: 1.7 }}>
                    {summary.action_items.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </>
              )}
            </div>
          )}
        </Card>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 10 }}>{t.ttsTitle}</div>
          <textarea value={ttsText} onChange={(e) => setTtsText(e.target.value)} placeholder={t.ttsPlaceholder} rows={6} className="oc-focusable"
            style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 10, padding: 10, fontSize: 13.5, background: "var(--surface-sunken)" }} />
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <PrimaryButton onClick={speak} disabled={!ttsText.trim() || speaking} icon={Volume2}>{t.speak}</PrimaryButton>
            {speaking && <GhostButton onClick={stopSpeak} icon={StopCircle}>{t.stopSpeak}</GhostButton>}
          </div>
        </Card>
      </div>
    </ModuleShell>
  );
}

/* ============================================================================
   MODULE: AI AGENT PLATFORM — agent library + one genuinely runnable agent
   ============================================================================ */
const agentsText = {
  en: { eyebrow: "Module 05", title: "AI Agent Platform", desc: "Eight specialized agents, each backed by a live call with its own tailored prompt — click any card to run it.",
    tasksToday: "runs this session", statusActive: "Active", statusIdle: "Idle", run: "Run agent", running: "Working…",
    collapse: "Collapse",
  },
  ar: { eyebrow: "الوحدة ٠٥", title: "منصة الوكلاء الأذكياء", desc: "ثمانية وكلاء متخصصون، كل منهم مدعوم باستدعاء مباشر بمطالبة مخصصة له — انقر أي بطاقة لتشغيلها.",
    tasksToday: "تشغيلة في هذه الجلسة", statusActive: "نشط", statusIdle: "خامل", run: "تشغيل الوكيل", running: "جارٍ العمل…",
    collapse: "طي",
  },
};

const AGENT_DEFS = [
  { key: "research", en: "Research Agent", ar: "وكيل البحث", enDesc: "Gathers and structures information on a topic", arDesc: "يجمع المعلومات حول موضوع وينظمها", seedRuns: 24,
    placeholder: { en: "e.g. \"Key risks of adopting RAG in a regulated industry\"", ar: "مثال: \"أهم مخاطر تبنّي RAG في قطاع منظّم\"" },
    system: { en: "You are a Research Agent inside an enterprise AI agent platform. You have a web search tool — use it whenever the topic benefits from current information. Produce a structured brief (a heading, 3-4 key findings as bullet points, and a one-line takeaway) on the given topic. Be concrete, not generic.",
      ar: "أنت وكيل بحث ضمن منصة وكلاء ذكاء اصطناعي للمؤسسات. لديك أداة بحث في الويب — استخدمها كلما استفاد الموضوع من معلومات حالية. أنتج موجزًا منظّمًا (عنوان، 3-4 نقاط رئيسية، خلاصة سطر واحد) حول الموضوع المعطى. كن ملموسًا." } },
  { key: "planning", en: "Planning Agent", ar: "وكيل التخطيط", enDesc: "Breaks objectives into ordered task plans", arDesc: "يقسّم الأهداف إلى خطط عمل مرتبة", seedRuns: 12,
    placeholder: { en: "e.g. \"Launch a customer loyalty program in Q1\"", ar: "مثال: \"إطلاق برنامج ولاء للعملاء في الربع الأول\"" },
    system: { en: "You are a Planning Agent. Break the given objective into an ordered, numbered task plan (5-8 steps), each with a one-clause reason it matters. End with the single biggest risk to the plan.",
      ar: "أنت وكيل تخطيط. قسّم الهدف المعطى إلى خطة مهام مرقّمة ومرتبة (5-8 خطوات)، مع سبب موجز لأهمية كل خطوة. اختم بأكبر خطر يهدد الخطة." } },
  { key: "coding", en: "Coding Assistant", ar: "مساعد البرمجة", enDesc: "Drafts and reviews code changes", arDesc: "يصيغ التعديلات البرمجية ويراجعها", seedRuns: 41,
    placeholder: { en: "e.g. \"Write a function to validate an email address in Python\"", ar: "مثال: \"اكتب دالة للتحقق من صحة بريد إلكتروني بلغة Python\"" },
    system: { en: "You are a Coding Assistant. Write clean, correct code for the given request with brief inline comments, then a 1-2 sentence explanation below it. Prefer the language the user implies, default to Python if unclear.",
      ar: "أنت مساعد برمجة. اكتب كودًا نظيفًا وصحيحًا للطلب المعطى مع تعليقات موجزة داخل الكود، ثم اشرح في جملة أو جملتين أسفله. افترض لغة Python إن لم تُحدَّد لغة." } },
  { key: "data", en: "Data Analyst Agent", ar: "وكيل تحليل البيانات", enDesc: "Explores datasets and drafts findings", arDesc: "يستكشف البيانات ويصيغ النتائج", seedRuns: 18,
    placeholder: { en: "e.g. \"We have 6 months of e-commerce orders — what should we look for first?\"", ar: "مثال: \"لدينا 6 أشهر من طلبات التجارة الإلكترونية — بماذا نبدأ التحليل؟\"" },
    system: { en: "You are a Data Analyst Agent. Given a description of a dataset or business question, propose a concrete analysis plan: 3-4 specific things to check first, the metric each answers, and what a concerning result would look like for each. Don't invent numbers you don't have.",
      ar: "أنت وكيل تحليل بيانات. بالنظر إلى وصف مجموعة بيانات أو سؤال عمل، اقترح خطة تحليل ملموسة: 3-4 أمور محددة يجب فحصها أولاً، والمقياس الذي تجيب عنه كل منها، وشكل النتيجة المقلقة لكل منها. لا تختلق أرقامًا لا تملكها." } },
  { key: "support", en: "Customer Support Agent", ar: "وكيل دعم العملاء", enDesc: "Drafts responses to incoming tickets", arDesc: "يصيغ ردودًا على التذاكر الواردة", seedRuns: 63,
    placeholder: { en: "Paste a customer message or complaint…", ar: "الصق رسالة أو شكوى عميل…" },
    system: { en: "You are a Customer Support Agent for an enterprise software platform. Draft a professional, empathetic reply to the given customer message: acknowledge the issue specifically, state a clear next step, keep it under 120 words.",
      ar: "أنت وكيل دعم عملاء لمنصة برمجيات للمؤسسات. صِغ ردًا مهنيًا ومتعاطفًا على رسالة العميل المعطاة: اعترف بالمشكلة تحديدًا، وحدّد خطوة تالية واضحة، وابقَ ضمن 120 كلمة." } },
  { key: "finance", en: "Finance Agent", ar: "وكيل الشؤون المالية", enDesc: "Flags anomalies in spend and invoices", arDesc: "يرصد الشذوذ في الإنفاق والفواتير", seedRuns: 9,
    placeholder: { en: "e.g. \"Marketing spend jumped from $12k to $47k this month\"", ar: "مثال: \"ارتفع إنفاق التسويق من 12 ألف إلى 47 ألف دولار هذا الشهر\"" },
    system: { en: "You are a Finance Agent that flags spend/invoice anomalies. Given the scenario, list the most likely explanations ranked by probability, the one question you'd ask the budget owner first, and whether this warrants an audit flag.",
      ar: "أنت وكيل مالي يرصد الشذوذ في الإنفاق والفواتير. بالنظر إلى السيناريو، اذكر أكثر التفسيرات احتمالًا مرتبة، والسؤال الأول الذي ستطرحه على مالك الميزانية، وهل يستدعي هذا وضع علامة تدقيق." } },
  { key: "hr", en: "HR Agent", ar: "وكيل الموارد البشرية", enDesc: "Answers policy questions, drafts letters", arDesc: "يجيب عن أسئلة السياسات ويصيغ الخطابات", seedRuns: 7,
    placeholder: { en: "e.g. \"What's a fair approach to a remote work request?\"", ar: "مثال: \"ما نهج عادل للتعامل مع طلب عمل عن بُعد؟\"" },
    system: { en: "You are an HR Agent. Answer the policy question with general best-practice guidance, and note clearly that specific cases need review against the actual company policy and local employment law — don't state law as fact.",
      ar: "أنت وكيل موارد بشرية. أجب عن سؤال السياسة بإرشاد عام لأفضل الممارسات، ونوّه بوضوح إلى أن الحالات المحددة تحتاج مراجعة وفق سياسة الشركة الفعلية وقانون العمل المحلي — لا تذكر القانون كحقيقة قطعية." } },
  { key: "reporting", en: "Reporting Agent", ar: "وكيل التقارير", enDesc: "Compiles cross-module weekly reports", arDesc: "يجمّع تقارير أسبوعية من عدة وحدات", seedRuns: 5,
    placeholder: { en: "Leave blank to summarize this session, or add focus notes…", ar: "اتركه فارغًا لتلخيص هذه الجلسة، أو أضف ملاحظات تركيز…" },
    system: null /* built dynamically from real session stats, see buildReportingPrompt */ },
];

function buildReportingPrompt(lang, note, stats) {
  const base = lang === "ar"
    ? `أنت وكيل تقارير يجمّع ملخصًا أسبوعيًا عبر وحدات منصة أومنيكور. بيانات هذه الجلسة: مقتطفات قاعدة معرفة: ${stats.kb}، رسائل دردشة: ${stats.chat}، صور محلَّلة: ${stats.images}، إجراءات مسجَّلة: ${stats.activity}. اكتب تقريرًا تنفيذيًا موجزًا (3-4 جمل) بهذه الأرقام، ثم توصية واحدة.`
    : `You are a Reporting Agent compiling a weekly summary across OmniCore's modules. This session's real data: knowledge base snippets: ${stats.kb}, chat messages: ${stats.chat}, images analyzed: ${stats.images}, logged activities: ${stats.activity}. Write a short executive summary (3-4 sentences) grounded in these numbers, then one recommendation.`;
  return note ? base + (lang === "ar" ? `\n\nملاحظات تركيز إضافية: ${note}` : `\n\nAdditional focus notes: ${note}`) : base;
}

function AgentCard({ agent, lang, logActivity, sessionStats }) {
  const t = agentsText[lang];
  const label = lang === "ar" ? agent.ar : agent.en;
  const displayDesc = lang === "ar" ? agent.arDesc : agent.enDesc;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [runs, setRuns] = useState(agent.seedRuns);

  const run = async () => {
    const isReporting = agent.key === "reporting";
    if (!isReporting && !input.trim()) return;
    setRunning(true); setOutput("");
    try {
      const system = isReporting ? "You are a precise reporting engine. Ground every claim in the numbers given." : agent.system[lang];
      const userContent = isReporting ? buildReportingPrompt(lang, input, sessionStats) : input;
      const text = await callClaude({ system, messages: [{ role: "user", content: userContent }], maxTokens: 550, enableTools: agent.key === "research" });
      setOutput(text);
      setRuns((r) => r + 1);
      logActivity((lang === "ar" ? "شغّل " : "Ran ") + label);
    } catch (e) {
      setOutput((lang === "ar" ? "خطأ: " : "Error: ") + e.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card style={{ cursor: "pointer" }}>
      <div onClick={() => setOpen((o) => !o)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bot size={16} color="var(--accent)" />
          </div>
          <Badge tone="accent" icon={CheckCircle2}>{commonText[lang].live}</Badge>
        </div>
        <div style={{ fontWeight: 700, fontSize: 14, marginTop: 10 }}>{label}</div>
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 3, lineHeight: 1.5 }}>{displayDesc}</div>
        <div className="oc-mono" style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 8 }}>{runs} {t.tasksToday}</div>
      </div>
      {open && (
        <div className="oc-fade-up" style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder={agent.key === "reporting" ? agent.placeholder[lang] : agent.placeholder[lang]}
            rows={2} className="oc-focusable" style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: 9, fontSize: 12.5, background: "var(--surface-sunken)", resize: "vertical" }} />
          <div style={{ marginTop: 8 }}>
            <PrimaryButton onClick={run} disabled={running || (agent.key !== "reporting" && !input.trim())} icon={running ? Loader2 : Play}>
              {running ? t.running : t.run}
            </PrimaryButton>
          </div>
          {running && <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}><Skeleton w="90%" /><Skeleton w="70%" /></div>}
          {output && <p style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{output}</p>}
        </div>
      )}
    </Card>
  );
}

function AIAgentPlatform({ lang, logActivity, knowledgeBase, chatMessages, activityLog, imageAnalysesCount }) {
  const t = agentsText[lang];
  const sessionStats = { kb: knowledgeBase.length, chat: chatMessages.length, images: imageAnalysesCount, activity: activityLog.length };
  return (
    <ModuleShell>
      <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 12 }}>
        {AGENT_DEFS.map((a) => (
          <AgentCard key={a.key} agent={a} lang={lang} logActivity={logActivity} sessionStats={sessionStats} />
        ))}
      </div>
    </ModuleShell>
  );
}

/* ============================================================================
   MODULE: PREDICTIVE ANALYTICS — real trained model, real held-out metrics
   ============================================================================ */
const analyticsText = {
  en: { eyebrow: "Module 06", title: "Predictive Analytics", desc: "A real churn-prediction model, trained and evaluated on the IBM Watson Telco Customer Churn dataset (7,043 real customers).",
    metricCards: { accuracy: "Accuracy", precision: "Precision", recall: "Recall", f1: "F1 score", auc: "ROC-AUC" },
    whyNotAcc: "Why not just accuracy?", whyNotAccBody: "Only 26.5% of customers in this dataset actually churn. A model that always predicts \"no churn\" scores 73.5% accuracy while catching zero at-risk customers. That's why this model is selected and tuned on F1 / recall, not raw accuracy.",
    confusionTitle: "Confusion matrix", confusionDesc: "On 1,409 held-out customers the model never trained on",
    rocTitle: "ROC curve", rocDesc: "True positive rate vs. false positive rate across thresholds",
    driversTitle: "Top churn drivers", driversDesc: "Feature importance from the trained model",
    cardTitle: "Model card", cardBody: "Model: Random Forest (selected over Logistic Regression and XGBoost by 5-fold CV F1) · Threshold 0.60, tuned on a held-out validation split to balance precision and recall · Trained on 5,634 customers, evaluated once on 1,409 never seen during training or tuning.",
    connectTitle: "How this connects to the backend", connectBody: "This model runs server-side — see churn_model.joblib and POST /api/predict/churn in the backend. The try-it panel to the right calls that real endpoint live; nothing here is reimplemented in the browser.",
    labels: { noChurn: "No churn", churn: "Churn" }, predicted: "Predicted", actual: "Actual",
    tryTitle: "Try a live prediction", tryDesc: "This calls the real model on the backend, not a client-side approximation.",
    fields: { tenure: "Tenure (months)", contract: "Contract", internet: "Internet service", security: "Online security", support: "Tech support", monthly: "Monthly charges ($)", total: "Total charges ($)" },
    predict: "Predict", predicting: "Predicting…", riskLabel: "Churn probability", willChurn: "Likely to churn", wontChurn: "Likely to stay", errorMsg: "Couldn't reach the backend. Is it running? (docker compose up)",
  },
  ar: { eyebrow: "الوحدة ٠٦", title: "التحليلات التنبؤية", desc: "نموذج حقيقي للتنبؤ بتسرّب العملاء، مُدرَّب ومُقيَّم على بيانات IBM Watson لتسرّب عملاء الاتصالات (7,043 عميلًا حقيقيًا).",
    metricCards: { accuracy: "الدقة", precision: "الدقة الموجبة", recall: "الاستدعاء", f1: "درجة F1", auc: "ROC-AUC" },
    whyNotAcc: "لماذا لا نعتمد على الدقة فقط؟", whyNotAccBody: "26.5% فقط من العملاء في هذه البيانات تسرّبوا فعليًا. نموذج يتنبأ دائمًا بـ«لا تسرّب» يحقق دقة 73.5% دون رصد أي عميل معرّض للخطر. لذلك اختير هذا النموذج وضُبط بناءً على F1 والاستدعاء، لا الدقة الخام.",
    confusionTitle: "مصفوفة الالتباس", confusionDesc: "على 1,409 عميل لم يتدرّب عليهم النموذج إطلاقًا",
    rocTitle: "منحنى ROC", rocDesc: "معدل الإيجابيات الحقيقية مقابل معدل الإيجابيات الخاطئة عبر العتبات",
    driversTitle: "أهم مسببات التسرّب", driversDesc: "أهمية الخصائص من النموذج المُدرَّب",
    cardTitle: "بطاقة النموذج", cardBody: "النموذج: غابة عشوائية (اختير على الانحدار اللوجستي وXGBoost عبر F1 بالتحقق المتقاطع خماسي الطيات) · عتبة 0.60، ضُبطت على تقسيم تحقق منفصل لموازنة الدقة الموجبة والاستدعاء · دُرِّب على 5,634 عميلًا، وقُيِّم مرة واحدة على 1,409 لم يُرَوا أثناء التدريب أو الضبط.",
    connectTitle: "كيف يتصل هذا بالخادم", connectBody: "يعمل هذا النموذج من جانب الخادم — راجع churn_model.joblib وPOST /api/predict/churn في الخادم. لوحة «جرّب» على اليمين تستدعي تلك النقطة الحقيقية مباشرة؛ لا شيء هنا مُعاد تنفيذه في المتصفح.",
    labels: { noChurn: "لا تسرّب", churn: "تسرّب" }, predicted: "المتوقَّع", actual: "الفعلي",
    tryTitle: "جرّب تنبؤًا مباشرًا", tryDesc: "هذا يستدعي النموذج الحقيقي على الخادم، وليس تقريبًا من جانب المتصفح.",
    fields: { tenure: "مدة الاشتراك (أشهر)", contract: "نوع العقد", internet: "خدمة الإنترنت", security: "الأمان عبر الإنترنت", support: "الدعم الفني", monthly: "الرسوم الشهرية ($)", total: "إجمالي الرسوم ($)" },
    predict: "تنبؤ", predicting: "جارٍ التنبؤ…", riskLabel: "احتمالية التسرّب", willChurn: "مرجّح أن يتسرّب", wontChurn: "مرجّح أن يبقى", errorMsg: "تعذّر الوصول إلى الخادم. هل يعمل؟ (docker compose up)",
  },
};

function PredictiveAnalytics({ lang, churnMetrics, confusionMatrix, rocCurve, featureImportance }) {
  const t = analyticsText[lang];
  if (!churnMetrics) return <ModuleShell><SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc} /><Skeleton h={200} /></ModuleShell>;

  const metricList = [
    { k: "accuracy", v: churnMetrics.accuracy }, { k: "precision", v: churnMetrics.precision },
    { k: "recall", v: churnMetrics.recall }, { k: "f1", v: churnMetrics.f1 }, { k: "auc", v: churnMetrics.roc_auc },
  ];

  return (
    <ModuleShell>
      <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc} action={<Badge tone="accent" icon={CheckCircle2}>{lang === "ar" ? "نموذج حقيقي مُدرَّب" : "Real trained model"}</Badge>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 14 }}>
        {metricList.map((m) => (
          <Card key={m.k}>
            <div className="oc-mono" style={{ fontSize: 24, fontWeight: 700 }}>{(m.v * 100).toFixed(1)}<span style={{ fontSize: 13, color: "var(--ink-faint)" }}>%</span></div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>{t.metricCards[m.k]}</div>
          </Card>
        ))}
      </div>
      <Card style={{ marginBottom: 14, background: "var(--surface-sunken)", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <AlertTriangle size={16} color="var(--spark)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.whyNotAcc}</div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4, lineHeight: 1.55 }}>{t.whyNotAccBody}</div>
          </div>
        </div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="oc-chat-grid">
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{t.confusionTitle}</div>
          <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 12 }}>{t.confusionDesc}</div>
          {confusionMatrix && (
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: 6, fontSize: 12.5, alignItems: "center" }}>
              <div /><div style={{ textAlign: "center", fontWeight: 600, color: "var(--ink-faint)" }}>{t.labels.noChurn}</div><div style={{ textAlign: "center", fontWeight: 600, color: "var(--ink-faint)" }}>{t.labels.churn}</div>
              <div style={{ fontWeight: 600, color: "var(--ink-faint)" }}>{t.labels.noChurn}</div>
              <div className="oc-mono" style={{ background: "var(--success-soft)", color: "var(--success)", textAlign: "center", padding: "14px 0", borderRadius: 8, fontWeight: 700 }}>{confusionMatrix.matrix[0][0]}</div>
              <div className="oc-mono" style={{ background: "var(--danger-soft)", color: "var(--danger)", textAlign: "center", padding: "14px 0", borderRadius: 8, fontWeight: 700 }}>{confusionMatrix.matrix[0][1]}</div>
              <div style={{ fontWeight: 600, color: "var(--ink-faint)" }}>{t.labels.churn}</div>
              <div className="oc-mono" style={{ background: "var(--danger-soft)", color: "var(--danger)", textAlign: "center", padding: "14px 0", borderRadius: 8, fontWeight: 700 }}>{confusionMatrix.matrix[1][0]}</div>
              <div className="oc-mono" style={{ background: "var(--success-soft)", color: "var(--success)", textAlign: "center", padding: "14px 0", borderRadius: 8, fontWeight: 700 }}>{confusionMatrix.matrix[1][1]}</div>
            </div>
          )}
        </Card>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{t.rocTitle}</div>
          <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 4 }}>{t.rocDesc}</div>
          {rocCurve && (
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={rocCurve} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="#ECECE8" />
                <XAxis dataKey="fpr" tick={{ fontSize: 10, fill: "#93968E" }} axisLine={false} tickLine={false} />
                <YAxis dataKey="tpr" tick={{ fontSize: 10, fill: "#93968E" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10 }} />
                <Line type="monotone" dataKey="tpr" stroke="#0C8479" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
      <div style={{ marginTop: 14 }}>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{t.driversTitle}</div>
          <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 10 }}>{t.driversDesc}</div>
          {featureImportance && (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={featureImportance} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid stroke="#ECECE8" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#93968E" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="feature" width={140} tick={{ fontSize: 10.5, fill: "#5B5F66" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10 }} />
                <Bar dataKey="importance" fill="#0C8479" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }} className="oc-chat-grid">
        <Card>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>{t.cardTitle}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.6, marginBottom: 10 }}>{t.cardBody}</div>
          <div style={{ fontSize: 12, color: "var(--ink-faint)", lineHeight: 1.6, paddingTop: 10, borderTop: "1px solid var(--border)" }}>{t.connectBody}</div>
        </Card>
        <WhatIfPredictor lang={lang} t={t} />
      </div>
    </ModuleShell>
  );
}

function WhatIfPredictor({ lang, t }) {
  const [form, setForm] = useState({
    tenure: 3, Contract: "Month-to-month", InternetService: "Fiber optic",
    OnlineSecurity: "No", TechSupport: "No", MonthlyCharges: 85, TotalCharges: 255,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) => {
    const val = e.target.type === "number" ? Number(e.target.value) : e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
  };

  const predict = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await predictChurn(form);
      setResult(res);
    } catch (e) {
      setError(t.errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const selectStyle = { width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 9px", fontSize: 12.5, background: "var(--surface-sunken)" };
  const labelStyle = { fontSize: 11.5, color: "var(--ink-faint)", marginBottom: 3, display: "block" };

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.tryTitle}</div>
        <Badge tone="accent" icon={CheckCircle2}>{commonText[lang].live}</Badge>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginBottom: 10 }}>{t.tryDesc}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <label style={labelStyle}>{t.fields.tenure}</label>
          <input type="number" min={0} max={100} value={form.tenure} onChange={set("tenure")} style={selectStyle} />
        </div>
        <div>
          <label style={labelStyle}>{t.fields.contract}</label>
          <select value={form.Contract} onChange={set("Contract")} style={selectStyle}>
            <option>Month-to-month</option><option>One year</option><option>Two year</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>{t.fields.internet}</label>
          <select value={form.InternetService} onChange={set("InternetService")} style={selectStyle}>
            <option>Fiber optic</option><option>DSL</option><option>No</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>{t.fields.security}</label>
          <select value={form.OnlineSecurity} onChange={set("OnlineSecurity")} style={selectStyle}>
            <option>No</option><option>Yes</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>{t.fields.support}</label>
          <select value={form.TechSupport} onChange={set("TechSupport")} style={selectStyle}>
            <option>No</option><option>Yes</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>{t.fields.monthly}</label>
          <input type="number" min={0} step={0.5} value={form.MonthlyCharges} onChange={set("MonthlyCharges")} style={selectStyle} />
        </div>
      </div>
      <PrimaryButton onClick={predict} disabled={loading} icon={loading ? Loader2 : TrendingUp} style={{ width: "100%", justifyContent: "center" }}>
        {loading ? t.predicting : t.predict}
      </PrimaryButton>
      {error && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 10 }}>{error}</div>}
      {result && (
        <div className="oc-fade-up" style={{ marginTop: 12, padding: 12, borderRadius: 10, background: result.will_churn ? "var(--danger-soft)" : "var(--success-soft)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: result.will_churn ? "var(--danger)" : "var(--success)" }}>
              {result.will_churn ? t.willChurn : t.wontChurn}
            </span>
            <span className="oc-mono" style={{ fontSize: 18, fontWeight: 700, color: result.will_churn ? "var(--danger)" : "var(--success)" }}>
              {(result.churn_probability * 100).toFixed(1)}%
            </span>
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>{t.riskLabel} · threshold {result.threshold_used}</div>
        </div>
      )}
    </Card>
  );
}

/* ============================================================================
   MODULE: RECOMMENDATION ENGINE — curated sample data, tabbed, filterable
   ============================================================================ */
const recommendText = {
  en: { eyebrow: "Module 07", title: "Recommendation Engine", desc: "The panel above is a live, personalized call to your model. The tabs below are representative sample data — a real recommender needs behavioral logs a fresh session doesn't have yet.",
    because: "Because",
    tabs: { products: "Products", courses: "Courses", documents: "Documents", employees: "Employees", resources: "Resources", workflows: "Workflows" },
    items: {
      products: [
        { title: "Enterprise SSO Add-on", why: "3 teammates enabled MFA this week", score: 92 },
        { title: "Advanced OCR Pack", why: "You process scanned invoices often", score: 87 },
        { title: "Priority Support Tier", why: "Usage grew 34% this month", score: 74 },
      ],
      courses: [
        { title: "RAG Systems in Production", why: "You use the Chat Assistant frequently", score: 95 },
        { title: "Data Governance Fundamentals", why: "Relevant to your Security module activity", score: 81 },
        { title: "Prompt Design for Agents", why: "You ran the Research Agent", score: 78 },
      ],
      documents: [
        { title: "Q3 Churn Playbook.pdf", why: "Related to your Predictive Analytics results", score: 90 },
        { title: "Vendor Security Questionnaire.docx", why: "Viewed by your team this week", score: 69 },
        { title: "Onboarding Checklist.pdf", why: "Popular in HR workspace", score: 61 },
      ],
      employees: [
        { title: "Sara K. — Data Science", why: "Working on a similar churn analysis", score: 88 },
        { title: "Omar R. — Platform Security", why: "Owns the RBAC policy you viewed", score: 72 },
      ],
      resources: [
        { title: "GPU inference pool — us-east", why: "Vision module usage trending up", score: 84 },
        { title: "Shared knowledge base template", why: "You've added 3+ snippets this session", score: 65 },
      ],
      workflows: [
        { title: "Auto-escalate high-risk churn accounts", why: "Matches your model's top driver", score: 93 },
        { title: "Weekly executive digest", why: "You generated 2 AI insights today", score: 76 },
      ],
    },
  },
  ar: { eyebrow: "الوحدة ٠٧", title: "محرك التوصيات", desc: "اللوحة أعلاه استدعاء مباشر ومخصص لنموذجك. علامات التبويب أدناه بيانات توضيحية تمثيلية — المُوصي الحقيقي يحتاج سجلات سلوكية لا تملكها جلسة جديدة بعد.",
    because: "بسبب",
    tabs: { products: "المنتجات", courses: "الدورات", documents: "المستندات", employees: "الموظفون", resources: "الموارد", workflows: "سير العمل" },
    items: {
      products: [
        { title: "إضافة تسجيل الدخول الموحّد", why: "3 زملاء فعّلوا المصادقة الثنائية هذا الأسبوع", score: 92 },
        { title: "حزمة OCR المتقدمة", why: "تعالج فواتير ممسوحة ضوئيًا كثيرًا", score: 87 },
        { title: "باقة الدعم ذات الأولوية", why: "نما الاستخدام 34% هذا الشهر", score: 74 },
      ],
      courses: [
        { title: "أنظمة RAG في الإنتاج", why: "تستخدم مساعد الدردشة بكثرة", score: 95 },
        { title: "أساسيات حوكمة البيانات", why: "متعلق بنشاطك في وحدة الأمان", score: 81 },
        { title: "تصميم المطالبات للوكلاء", why: "شغّلت وكيل البحث", score: 78 },
      ],
      documents: [
        { title: "دليل تسرّب الربع الثالث.pdf", why: "متعلق بنتائج التحليلات التنبؤية", score: 90 },
        { title: "استبيان أمان المورّدين.docx", why: "شاهده فريقك هذا الأسبوع", score: 69 },
        { title: "قائمة تأهيل الموظفين.pdf", why: "شائع في مساحة الموارد البشرية", score: 61 },
      ],
      employees: [
        { title: "سارة ك. — علوم البيانات", why: "تعمل على تحليل تسرّب مشابه", score: 88 },
        { title: "عمر ر. — أمان المنصة", why: "يملك سياسة RBAC التي شاهدتها", score: 72 },
      ],
      resources: [
        { title: "مجمع استدلال GPU — شرق الولايات المتحدة", why: "استخدام وحدة الرؤية في ازدياد", score: 84 },
        { title: "قالب قاعدة معرفة مشتركة", why: "أضفت 3+ مقتطفات هذه الجلسة", score: 65 },
      ],
      workflows: [
        { title: "تصعيد تلقائي لحسابات التسرّب عالية الخطورة", why: "يطابق أهم مؤشر في نموذجك", score: 93 },
        { title: "موجز تنفيذي أسبوعي", why: "أنشأت رؤيتين بالذكاء الاصطناعي اليوم", score: 76 },
      ],
    },
  },
};

const recommendLiveText = {
  en: { panelLabel: "Personalized for this session", generate: "Generate", placeholder: "Click generate — this reads your actual session activity (documents added, chats had) and asks the model for real picks, not the sample list below.",
    note: "The tabs below this are representative sample data (a real recommender needs behavioral logs a fresh session doesn't have yet) — but this panel is genuinely live." },
  ar: { panelLabel: "مخصص لهذه الجلسة", generate: "إنشاء", placeholder: "انقر «إنشاء» — يقرأ هذا نشاط جلستك الفعلي (المستندات المضافة والمحادثات) ويطلب من النموذج اقتراحات حقيقية، لا القائمة التوضيحية أدناه.",
    note: "علامات التبويب أدناه بيانات توضيحية تمثيلية (المُوصي الحقيقي يحتاج سجلات سلوكية لا تملكها جلسة جديدة بعد) — لكن هذه اللوحة مباشرة فعليًا." },
};

function RecommendationEngine({ lang, knowledgeBase, chatMessages, activityLog, logActivity }) {
  const t = recommendText[lang];
  const lt = recommendLiveText[lang];
  const c = commonText[lang];
  const [tab, setTab] = useState("products");
  const [live, setLive] = useState("");
  const [loadingLive, setLoadingLive] = useState(false);

  const generateLive = async () => {
    setLoadingLive(true); setLive("");
    try {
      const stats = `Knowledge base snippets: ${knowledgeBase.map((k) => k.title).join(", ") || "none"}. Recent chat topics: ${chatMessages.slice(-4).map((m) => m.content.slice(0, 60)).join(" | ") || "none"}. Recent activity: ${activityLog.slice(0, 5).map((a) => a.text).join("; ") || "none"}.`;
      const system = lang === "ar"
        ? "أنت محرك توصيات لمنصة أومنيكور. بناءً على نشاط الجلسة الفعلي المعطى، اقترح 3 توصيات ملموسة (مورد، دورة، أو إجراء تالٍ) مع سبب موجز لكل منها مرتبط مباشرة بالنشاط المعطى. إن لم يوجد نشاط كافٍ، قل ذلك واقترح كيفية البدء."
        : "You are OmniCore's recommendation engine. Based on the given real session activity, suggest 3 concrete recommendations (a resource, a course, or a next action) each with a one-line reason tied directly to the specific activity given. If there isn't enough activity yet, say so and suggest how to get started.";
      const text = await callClaude({ system, messages: [{ role: "user", content: stats }], maxTokens: 400 });
      setLive(text);
      logActivity(lang === "ar" ? "أنشأ توصيات مخصصة" : "Generated personalized recommendations");
    } catch (e) {
      setLive((lang === "ar" ? "خطأ: " : "Error: ") + e.message);
    } finally {
      setLoadingLive(false);
    }
  };

  return (
    <ModuleShell>
      <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc} />
      <Card style={{ marginBottom: 16, background: "linear-gradient(135deg, var(--spark-soft), var(--surface))", borderColor: "#EFDCB0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--spark)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={16} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <Badge tone="spark" icon={Sparkles}>{lt.panelLabel}</Badge>
              <GhostButton onClick={generateLive} icon={loadingLive ? Loader2 : RefreshCw}>{lt.generate}</GhostButton>
            </div>
            <div style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.55 }}>
              {loadingLive ? <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><Skeleton w="90%" /><Skeleton w="70%" /></div> : (live || lt.placeholder)}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 10 }}>{lt.note}</div>
          </div>
        </div>
      </Card>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {Object.keys(t.tabs).map((k) => (
          <GhostButton key={k} active={tab === k} onClick={() => setTab(k)}>{t.tabs[k]}</GhostButton>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
        {t.items[tab].map((item, i) => (
          <Card key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{item.title}</div>
              <Badge tone="accent">{item.score}%</Badge>
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 8 }}>{t.because.toLowerCase()}: {item.why}</div>
          </Card>
        ))}
      </div>
    </ModuleShell>
  );
}

/* ============================================================================
   MODULE: ENTERPRISE SEARCH — functional: searches real session data
   (knowledge base + chat history) merged with representative sample records
   for source types the demo doesn't have live connectors for (email/DB/image).
   ============================================================================ */
const searchText = {
  en: { eyebrow: "Module 08", title: "Enterprise Search",
    desc: "Ranked search across your knowledge base and chat history from this session. Optionally include the live web.",
    placeholder: "Search documents and chats…", results: "results", noResults: "No matches. Try a different term, or add content in Chat / Document Intelligence first.",
    typeLabels: { kb: "Document", chat: "Chat", web: "Web" },
    webToggle: "Also search the web",
    webNote: "Off by default: when on, your search text is sent to public search engines via the self-hosted SearXNG. Your documents and chats are never sent.",
  },
  ar: { eyebrow: "الوحدة ٠٨", title: "البحث المؤسسي",
    desc: "بحث مرتَّب عبر قاعدة معرفتك وسجل محادثاتك في هذه الجلسة. ويمكنك اختياريًا تضمين الويب المباشر.",
    placeholder: "ابحث في المستندات والمحادثات…", results: "نتيجة", noResults: "لا تطابقات. جرّب كلمة أخرى، أو أضِف محتوى في الدردشة / ذكاء المستندات أولًا.",
    typeLabels: { kb: "مستند", chat: "دردشة", web: "ويب" },
    webToggle: "ابحث في الويب أيضًا",
    webNote: "متوقف افتراضيًا: عند تفعيله يُرسَل نص بحثك إلى محركات بحث عامة عبر SearXNG المستضاف ذاتيًا. لا تُرسَل مستنداتك ولا محادثاتك أبدًا.",
  },
};


function EnterpriseSearchModule({ lang, knowledgeBase, chatMessages, logActivity, token }) {
  const t = searchText[lang];
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [webAvailable, setWebAvailable] = useState(false);
  const [error, setError] = useState(null);
  // Off by default. This is the difference between "search my own data
  // locally" and "send my search text to public search engines" — the landing
  // page's privacy answer only holds if the second is something you opt into,
  // not something every keystroke-pause does silently.
  const [includeWeb, setIncludeWeb] = useState(false);
  // Log each distinct query once. Logging on every debounced request wrote an
  // audit event per pause in typing and per re-search, inflating the audit log
  // and the dashboard trend with noise.
  const lastLogged = useRef("");

  // Ranking happens server-side (term-frequency scoring with a coverage bonus,
  // Arabic-aware tokenising). Debounced so typing doesn't fire a request per
  // keystroke.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setError(null); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true); setError(null);
      // The API accepts at most 500 corpus items; a long chat would otherwise
      // 422 and (before the error fix) render as "[object Object]". Keep the
      // most recent, and bound each body so the payload stays reasonable.
      const corpus = [
        ...knowledgeBase.map((k, i) => ({ id: `kb-${i}`, type: "kb", title: k.title, body: String(k.content || "").slice(0, 8000) })),
        ...chatMessages.map((m, i) => ({
          id: `chat-${i}`, type: "chat",
          title: `${m.role === "user" ? "You" : "Assistant"} · turn ${i + 1}`, body: String(m.content || "").slice(0, 8000),
        })),
      ].slice(-500);
      try {
        const data = await apiFetch("/api/search", {
          token, method: "POST", body: { q, corpus, include_web: includeWeb, limit: 20 },
        });
        if (cancelled) return;
        setResults(data.results.map((r) => ({ ...r, full: r.type === "web" ? null : r.snippet })));
        setWebAvailable(data.web_available);
        if (lastLogged.current !== q) {
          lastLogged.current = q;
          logActivity(lang === "ar" ? `بحث عن: ${q}` : `Searched for: ${q}`, "search");
        }
      } catch (e) {
        if (!cancelled) { setResults([]); setError(e.message); }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 450);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, knowledgeBase, chatMessages, token, lang, includeWeb]);

  const typeIcon = { kb: FileText, chat: MessageSquare, web: Globe };

  return (
    <ModuleShell>
      <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc} action={<Badge tone="accent" icon={CheckCircle2}>{commonText[lang].live}</Badge>} />
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={16} color="var(--ink-faint)" style={{ position: "absolute", insetInlineStart: 14, top: 13 }} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.placeholder} className="oc-focusable"
          style={{ width: "100%", padding: "11px 14px 11px 40px", paddingInlineStart: 40, borderRadius: 12, border: "1px solid var(--border)", fontSize: 14.5, background: "var(--surface)" }} />
      </div>
      <div style={{ marginTop: -6, marginBottom: 14 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", cursor: "pointer" }}>
          <input type="checkbox" checked={includeWeb} onChange={(e) => setIncludeWeb(e.target.checked)} />
          <Globe size={13} /> {t.webToggle}
        </label>
        <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 4, lineHeight: 1.5 }}>{t.webNote}</div>
      </div>
      {error && (
        <div role="alert" style={{ fontSize: 12.5, color: "var(--danger)", background: "var(--danger-soft)", borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>{error}</div>
      )}
      {query.trim() && (
        <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 10, flexWrap: "wrap" }}>
          {searching ? <><Loader2 size={12} className="oc-pulse-dot" /> {commonText[lang].loading}</>
                     : <>{results.length} {t.results}</>}
          {webAvailable && <Badge tone="accent" icon={Globe}>{lang === "ar" ? "شمل الويب" : "web included"}</Badge>}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {query.trim() && !searching && results.length === 0 && <div style={{ fontSize: 13, color: "var(--ink-faint)" }}>{t.noResults}</div>}
        {results.map((r, i) => {
          const Icon = typeIcon[r.type] || FileText;
          const isOpen = expanded === i;
          const canExpand = !!r.full && !r.url;
          const Wrapper = r.url ? "a" : "div";
          const wrapperProps = r.url
            ? { href: r.url, target: "_blank", rel: "noopener noreferrer", style: { textDecoration: "none", color: "inherit" } }
            : { onClick: () => canExpand && setExpanded(isOpen ? null : i) };
          return (
            <Card key={i} padded={false} style={{ cursor: canExpand || r.url ? "pointer" : "default" }}>
              <Wrapper {...wrapperProps}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 14 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--surface-sunken)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={14} color="var(--ink-soft)" />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, fontSize: 13.5 }}>{r.title}</span>
                      <Badge tone={r.type === "web" ? "neutral" : "accent"}>
                        {t.typeLabels[r.type] || (r.type === "web" ? (lang === "ar" ? "ويب" : "web") : r.type)}
                      </Badge>
                      <span className="oc-mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>{r.score}</span>
                    </div>
                    {r.snippet && !isOpen && <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 3 }}>{r.snippet}</div>}
                    {isOpen && <div style={{ fontSize: 12.5, color: "var(--ink)", marginTop: 6, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{r.full}</div>}
                    {r.url && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4, fontSize: 11.5, color: "var(--accent)" }}>
                        <ExternalLink size={11} /> {r.url.slice(0, 70)}{r.url.length > 70 ? "…" : ""}
                      </div>
                    )}
                  </div>
                  {canExpand && <ChevronDown size={15} color="var(--ink-faint)" style={{ flexShrink: 0, marginTop: 2, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />}
                </div>
              </Wrapper>
            </Card>
          );
        })}
      </div>
    </ModuleShell>
  );
}

/* ============================================================================
   MODULE: AUTOMATION PLATFORM — sample automations, functional local toggles
   ============================================================================ */
const automationText = {
  en: { eyebrow: "Module 09", title: "Automation Platform", desc: "Toggling and creating automations are both fully functional. \"Create with AI\" genuinely calls your model to structure a new rule; wiring a toggle to a real trigger source is the remaining backend job-queue work.",
    trigger: "Trigger", action: "Action", runs7d: "runs / 7d", newAutomation: "New automation",
    items: [
      { en: "New high-risk churn score → Notify account owner", ar: "درجة تسرّب عالية الخطورة جديدة ← إشعار مالك الحساب", on: true, runs: 34 },
      { en: "Document uploaded → Auto-summarize + tag", ar: "رفع مستند ← تلخيص تلقائي ووسم", on: true, runs: 128 },
      { en: "Support ticket > 24h open → Escalate to manager", ar: "تذكرة دعم مفتوحة أكثر من 24 ساعة ← تصعيد إلى المدير", on: true, runs: 19 },
      { en: "Invoice OCR confidence < 80% → Route to human review", ar: "ثقة OCR للفاتورة أقل من 80% ← توجيه لمراجعة بشرية", on: true, runs: 47 },
      { en: "Weekly KPI digest → Email to executive team", ar: "موجز مؤشرات أداء أسبوعي ← بريد لفريق الإدارة", on: false, runs: 1 },
      { en: "New employee onboarded → Provision AI workspace access", ar: "انضمام موظف جديد ← منح صلاحية مساحة عمل الذكاء الاصطناعي", on: true, runs: 6 },
      { en: "Anomalous login pattern → Force MFA re-verification", ar: "نمط دخول غير معتاد ← إعادة تحقق إلزامية بالمصادقة الثنائية", on: false, runs: 3 },
    ],
  },
  ar: { eyebrow: "الوحدة ٠٩", title: "منصة الأتمتة", desc: "التبديل والإنشاء كلاهما فعّال بالكامل. «إنشاء بالذكاء الاصطناعي» يستدعي نموذجك فعليًا لصياغة قاعدة جديدة؛ ربط التبديل بمصدر تشغيل حقيقي هو العمل المتبقي في طابور مهام الخادم.",
    trigger: "المُحفِّز", action: "الإجراء", runs7d: "تشغيلة / 7 أيام", newAutomation: "أتمتة جديدة", items: [],
  },
};

const automationLiveText = {
  en: { createTitle: "Describe a new automation", createPlaceholder: "e.g. \"When a customer complains twice in a week, alert their account manager\"",
    create: "Create with AI", creating: "Drafting…", cancel: "Cancel" },
  ar: { createTitle: "صِف أتمتة جديدة", createPlaceholder: "مثال: \"عندما يشتكي عميل مرتين في أسبوع، نبّه مدير حسابه\"",
    create: "إنشاء بالذكاء الاصطناعي", creating: "جارٍ الصياغة…", cancel: "إلغاء" },
};

function AutomationPlatform({ lang, logActivity, token }) {
  const t = automationText[lang];
  const lt = automationLiveText[lang];
  // Rules live in Postgres, not component state. Everything below is a real
  // row: creating, toggling, running and deleting all round-trip to the API
  // and survive a refresh, which is what the previous in-memory version only
  // appeared to do.
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const reload = useCallback(async () => {
    try {
      setItems(await apiFetch("/api/workspace/automations", { token }));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { reload(); }, [reload]);

  const toggle = async (item) => {
    setBusyId(item.id);
    try {
      const updated = await apiFetch(
        `/api/workspace/automations/${item.id}?enabled=${!item.enabled}`,
        { token, method: "PATCH" });
      setItems((list) => list.map((it) => (it.id === item.id ? updated : it)));
      logActivity((lang === "ar" ? "بدّل أتمتة: " : "Toggled automation: ") + item.name, "automation");
    } catch (e) {
      setCreateError(e.message);
    } finally { setBusyId(null); }
  };

  const runNow = async (item) => {
    setBusyId(item.id);
    try {
      const updated = await apiFetch(`/api/workspace/automations/${item.id}/run`, { token, method: "POST" });
      setItems((list) => list.map((it) => (it.id === item.id ? updated : it)));
    } catch (e) {
      setCreateError(e.message);
    } finally { setBusyId(null); }
  };

  const remove = async (item) => {
    setBusyId(item.id);
    try {
      await apiFetch(`/api/workspace/automations/${item.id}`, { token, method: "DELETE" });
      setItems((list) => list.filter((it) => it.id !== item.id));
      logActivity((lang === "ar" ? "حذف أتمتة: " : "Deleted automation: ") + item.name, "automation");
    } catch (e) {
      setCreateError(e.message);
    } finally { setBusyId(null); }
  };

  const createFromDraft = async () => {
    if (!draft.trim()) return;
    setDrafting(true); setCreateError(null);
    try {
      const system = lang === "ar"
        ? "حوّل وصف الأتمتة هذا إلى JSON فقط بالمفتاحين: trigger (جملة قصيرة تصف متى يجب أن تعمل)، action (جملة قصيرة تصف ما يجب فعله). لا نص خارج JSON."
        : "Convert this automation description into JSON only, keys: trigger (short phrase describing when it should fire), action (short phrase describing what happens). Nothing outside the JSON.";
      let parsed;
      try {
        const raw = await callClaude({ system, messages: [{ role: "user", content: draft }], maxTokens: 150 });
        parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      } catch {
        // The model is optional here — it only splits a sentence into
        // trigger/action. If it's slow, unavailable or returns non-JSON, the
        // rule is still created from the raw description rather than lost.
        parsed = { trigger: draft, action: lang === "ar" ? "إجراء مخصص" : "Custom action" };
      }
      const created = await apiFetch("/api/workspace/automations", {
        token, method: "POST",
        body: { name: draft.slice(0, 150), trigger: String(parsed.trigger).slice(0, 380),
                action: String(parsed.action).slice(0, 380), enabled: true },
      });
      setItems((list) => [created, ...list]);
      logActivity((lang === "ar" ? "أنشأ أتمتة جديدة: " : "Created a new automation: ") + created.name, "automation");
      setDraft(""); setCreating(false);
    } catch (e) {
      setCreateError(e.message); // composer stays open so they can see the error and retry
    } finally {
      setDrafting(false);
    }
  };

  return (
    <ModuleShell>
      <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc} />
      {creating && (
        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 8 }}>{lt.createTitle}</div>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={lt.createPlaceholder} rows={2} className="oc-focusable"
            style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 10, padding: 10, fontSize: 13, background: "var(--surface-sunken)" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <PrimaryButton onClick={createFromDraft} disabled={drafting || !draft.trim()} icon={drafting ? Loader2 : Sparkles}>{drafting ? lt.creating : lt.create}</PrimaryButton>
            <GhostButton onClick={() => { setCreating(false); setDraft(""); setCreateError(null); }}>{lt.cancel}</GhostButton>
          </div>
          {createError && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 10 }}>{createError}</div>}
        </Card>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {loading && <Card><Skeleton w="60%" /></Card>}
        {!loading && items.length === 0 && (
          <Card>
            <div style={{ fontSize: 13.5, color: "var(--ink-faint)" }}>
              {lang === "ar"
                ? "لا توجد أتمتة بعد. أنشئ واحدة أدناه — ستُحفظ في قاعدة البيانات وتبقى بعد التحديث."
                : "No automations yet. Create one below — it's saved to the database and survives a refresh."}
            </div>
          </Card>
        )}
        {items.map((item) => (
          <Card key={item.id} padded={false}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", flexWrap: "wrap" }}>
              <button onClick={() => toggle(item)} disabled={busyId === item.id} className="oc-focusable" style={{
                width: 40, height: 22, borderRadius: 99, border: "none",
                cursor: busyId === item.id ? "wait" : "pointer", position: "relative", flexShrink: 0,
                background: item.enabled ? "var(--accent)" : "var(--border-strong)", transition: "background 0.15s",
              }}>
                <span style={{
                  position: "absolute", top: 2, insetInlineStart: item.enabled ? 20 : 2, width: 18, height: 18, borderRadius: 99,
                  background: "#fff", transition: "inset-inline-start 0.15s", boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }} />
              </button>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{item.trigger}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-faint)", display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                  <ArrowUpRight size={11} className="oc-flip" /> {item.action}
                </div>
              </div>
              <div className="oc-mono" style={{ fontSize: 12, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>
                {item.runs} {t.runs7d}
              </div>
              <Badge tone={item.enabled ? "success" : "neutral"}>{item.enabled ? "ON" : "OFF"}</Badge>
              <button onClick={() => runNow(item)} disabled={!item.enabled || busyId === item.id}
                title={lang === "ar" ? "تشغيل الآن" : "Run now"} className="oc-focusable"
                style={{ background: "none", border: "none", cursor: item.enabled ? "pointer" : "not-allowed",
                         color: item.enabled ? "var(--accent)" : "var(--ink-faint)", display: "flex", padding: 4 }}>
                <Play size={15} />
              </button>
              <button onClick={() => remove(item)} disabled={busyId === item.id}
                title={commonText[lang].delete} className="oc-focusable"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-faint)", display: "flex", padding: 4 }}>
                <Trash2 size={15} />
              </button>
            </div>
          </Card>
        ))}
      </div>
      <div style={{ marginTop: 14 }}>
        {!creating && <GhostButton onClick={() => setCreating(true)} icon={Plus}>{t.newAutomation}</GhostButton>}
      </div>
    </ModuleShell>
  );
}

/* ============================================================================
   MODULE: SECURITY & GOVERNANCE — live audit log (real session events) +
   sample RBAC / MFA / encryption panels.
   ============================================================================ */
const securityText = {
  en: { eyebrow: "Module 11", title: "Security & Governance", desc: "The audit log below is real and platform-wide — every user's logged actions, persisted in Postgres. This view is enforced admin-only by the API, not just hidden in the UI.",
    auditTitle: "Audit log", auditDesc: "All users · persisted", empty: "No actions logged yet.",
    rbacTitle: "Role-based access control", role: "Role", read: "Read", write: "Write", admin: "Admin",
    roles: [
      { role: "Analyst", read: true, write: false, admin: false },
      { role: "Manager", read: true, write: true, admin: false },
      { role: "Platform Admin", read: true, write: true, admin: true },
      { role: "Auditor (read-only)", read: true, write: false, admin: false },
    ],
    statusTitle: "Governance controls",
    controls: [
      { en: "Multi-factor authentication", ar: "المصادقة الثنائية", status: "enforced" },
      { en: "Data encryption at rest (AES-256)", ar: "تشفير البيانات أثناء التخزين (AES-256)", status: "enforced" },
      { en: "API rate limiting", ar: "تحديد معدل واجهة البرمجة", status: "enforced" },
      { en: "90-day data retention policy", ar: "سياسة الاحتفاظ بالبيانات 90 يومًا", status: "enforced" },
      { en: "Quarterly access review", ar: "مراجعة الوصول الفصلية", status: "scheduled" },
    ],
  },
  ar: { eyebrow: "الوحدة ١١", title: "الأمان والحوكمة", desc: "سجل التدقيق أدناه حقيقي — يظهر كل إجراء مُسجَّل في هذه الجلسة فور حدوثه.",
    auditTitle: "سجل التدقيق", auditDesc: "كل المستخدمين · محفوظ", empty: "لم يُسجَّل أي إجراء بعد.",
    rbacTitle: "التحكم بالوصول حسب الدور", role: "الدور", read: "قراءة", write: "كتابة", admin: "إدارة",
    roles: [
      { role: "محلّل", read: true, write: false, admin: false },
      { role: "مدير", read: true, write: true, admin: false },
      { role: "مسؤول المنصة", read: true, write: true, admin: true },
      { role: "مدقّق (قراءة فقط)", read: true, write: false, admin: false },
    ],
    statusTitle: "ضوابط الحوكمة", controls: [],
  },
};

function SecurityGovernance({ lang, activityLog, user, token }) {
  const t = securityText[lang];
  const c = commonText[lang];
  const enControls = securityText.en.controls;
  // Platform-wide audit rows, fetched from the admin-gated endpoint. The
  // check below only decides what to render; the API returns 403 to a
  // non-admin token regardless, so the restriction survives someone editing
  // their local role or calling the endpoint directly.
  const [audit, setAudit] = useState([]);
  const [auditError, setAuditError] = useState(null);

  useEffect(() => {
    if (user?.role !== "Platform Admin" || !token) return;
    apiFetch("/api/workspace/audit?limit=100", { token })
      .then(setAudit)
      .catch((e) => setAuditError(e.message));
  }, [token, user?.role, activityLog.length]);

  if (user?.role !== "Platform Admin") {
    return (
      <ModuleShell>
        <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc} />
        <Card style={{ textAlign: "center", padding: "48px 24px" }}>
          <ShieldCheck size={32} color="var(--ink-faint)" style={{ margin: "0 auto 14px" }} />
          <div style={{ fontWeight: 700, fontSize: 15 }}>{c.adminOnly}</div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 6, maxWidth: 380, marginInline: "auto" }}>{c.adminOnlyDesc}</div>
        </Card>
      </ModuleShell>
    );
  }

  return (
    <ModuleShell>
      <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc} action={<Badge tone="accent" icon={CheckCircle2}>{commonText[lang].live}</Badge>} />
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5 }}>{t.auditTitle}</div>
          <Badge tone="accent" icon={CircleDot}>{t.auditDesc}</Badge>
        </div>
        {auditError && (
          <div style={{ fontSize: 12.5, color: "var(--danger)", background: "var(--danger-soft)",
                        borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>{auditError}</div>
        )}
        {audit.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--ink-faint)" }}>{t.empty}</div>
        ) : (
          <div className="oc-scroll" style={{ maxHeight: 280, overflowY: "auto" }}>
            {audit.map((a) => (
              <div key={a.id} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--border)", fontSize: 12.5, alignItems: "baseline" }}>
                <span className="oc-mono" style={{ color: "var(--ink-faint)", flexShrink: 0 }}>
                  {new Date(a.created_at).toLocaleString(lang === "ar" ? "ar-SA" : "en-US",
                    { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
                <ScrollText size={13} color="var(--ink-faint)" style={{ flexShrink: 0 }} />
                <Badge tone="neutral">{a.username}</Badge>
                <span style={{ minWidth: 0 }}>
                  <strong style={{ fontWeight: 600 }}>{a.module}</strong>
                  {a.detail ? ` — ${a.detail}` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }} className="oc-chat-grid">
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 10 }}>{t.rbacTitle}</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ textAlign: "start", padding: "6px 4px", color: "var(--ink-faint)", fontWeight: 600, fontSize: 12 }}>{t.role}</th>
                <th style={{ padding: "6px 4px", color: "var(--ink-faint)", fontWeight: 600, fontSize: 12 }}>{t.read}</th>
                <th style={{ padding: "6px 4px", color: "var(--ink-faint)", fontWeight: 600, fontSize: 12 }}>{t.write}</th>
                <th style={{ padding: "6px 4px", color: "var(--ink-faint)", fontWeight: 600, fontSize: 12 }}>{t.admin}</th>
              </tr>
            </thead>
            <tbody>
              {t.roles.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px 4px", fontWeight: 600 }}>{r.role}</td>
                  {[r.read, r.write, r.admin].map((v, j) => (
                    <td key={j} style={{ textAlign: "center", padding: "8px 4px" }}>
                      {v ? <CheckCircle2 size={15} color="var(--success)" style={{ display: "inline" }} /> : <span style={{ color: "var(--border-strong)" }}>—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 10 }}>{t.statusTitle}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {enControls.map((ctrl, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ShieldCheck size={15} color={ctrl.status === "enforced" ? "var(--success)" : "var(--spark)"} />
                  <span style={{ fontSize: 13 }}>{lang === "ar" ? ctrl.ar : ctrl.en}</span>
                </div>
                <Badge tone={ctrl.status === "enforced" ? "success" : "spark"}>{ctrl.status === "enforced" ? (lang === "ar" ? "مُفعَّل" : "Enforced") : (lang === "ar" ? "مجدول" : "Scheduled")}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </ModuleShell>
  );
}

/* ============================================================================
   MODULE: PLUGIN & INTEGRATION HUB — sample connectors, functional toggles
   ============================================================================ */
const pluginsText = {
  en: { eyebrow: "Module 12", title: "Integration Hub", desc: "Connectors for ERP, CRM, storage, and messaging. New connectors plug in here without touching the core platform.",
    connect: "Connect", disconnect: "Disconnect", connected: "Connected", addCustom: "Add custom integration (REST / webhook)",
    honestyTitle: "What this screen actually does", honestyBody: "Toggles here update local state only — no real OAuth handshake happens. Real Salesforce/Gmail/etc. connections need a registered developer app with each vendor and your business's own credentials, which can't be wired up generically. This previews the management UI a real integration would plug into.",
    items: [
      { key: "sap", en: "SAP ERP", ar: "SAP ERP", cat: "ERP", connected: true },
      { key: "sf", en: "Salesforce", ar: "Salesforce", cat: "CRM", connected: true },
      { key: "gmail", en: "Gmail", ar: "Gmail", cat: "Email", connected: true },
      { key: "gdrive", en: "Google Drive", ar: "Google Drive", cat: "Storage", connected: false },
      { key: "slack", en: "Slack", ar: "Slack", cat: "Messaging", connected: true },
      { key: "sharepoint", en: "SharePoint", ar: "SharePoint", cat: "Storage", connected: false },
      { key: "postgres", en: "PostgreSQL", ar: "PostgreSQL", cat: "Database", connected: true },
      { key: "webhook", en: "Custom Webhooks", ar: "Webhooks مخصصة", cat: "API", connected: true },
    ],
  },
  ar: { eyebrow: "الوحدة ١٢", title: "مركز التكاملات", desc: "موصلات لأنظمة ERP وCRM والتخزين والمراسلة. تُضاف الموصلات الجديدة هنا دون المساس بجوهر المنصة.",
    connect: "ربط", disconnect: "قطع الربط", connected: "متصل", addCustom: "إضافة تكامل مخصص (REST / webhook)",
    honestyTitle: "ما الذي تفعله هذه الشاشة فعليًا", honestyBody: "التبديل هنا يحدّث حالة محلية فقط — لا تحدث مصافحة OAuth حقيقية. الاتصالات الحقيقية بـ Salesforce وGmail وغيرها تحتاج تطبيق مطوّر مسجَّل لدى كل مزوّد وبيانات اعتماد شركتك الخاصة، ولا يمكن ربطها بشكل عام. هذه معاينة لواجهة الإدارة التي سيتصل بها تكامل حقيقي.",
    items: [],
  },
};

function PluginHub({ lang, logActivity }) {
  const t = pluginsText[lang];
  const en = pluginsText.en;
  const [connected, setConnected] = useState(Object.fromEntries(en.items.map((i) => [i.key, i.connected])));

  const toggle = (item) => {
    setConnected((c) => ({ ...c, [item.key]: !c[item.key] }));
    const name = lang === "ar" ? item.ar : item.en;
    logActivity((connected[item.key] ? (lang === "ar" ? "قطع الاتصال: " : "Disconnected: ") : (lang === "ar" ? "اتصل بـ: " : "Connected: ")) + name);
  };

  return (
    <ModuleShell>
      <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc} action={<Badge>{commonText[lang].sample}</Badge>} />
      <Card style={{ marginBottom: 16, background: "var(--surface-sunken)" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <AlertTriangle size={16} color="var(--spark)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.honestyTitle}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 4, lineHeight: 1.55 }}>{t.honestyBody}</div>
          </div>
        </div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {en.items.map((item) => (
          <Card key={item.key}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--surface-sunken)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Link2 size={16} color="var(--ink-soft)" />
              </div>
              <Badge tone={connected[item.key] ? "success" : "neutral"}>{connected[item.key] ? t.connected : item.cat}</Badge>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, marginTop: 10 }}>{lang === "ar" ? item.ar : item.en}</div>
            <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 2 }}>{item.cat}</div>
            <div style={{ marginTop: 12 }}>
              <GhostButton onClick={() => toggle(item)} icon={connected[item.key] ? X : PlugZap}>
                {connected[item.key] ? t.disconnect : t.connect}
              </GhostButton>
            </div>
          </Card>
        ))}
        <Card style={{ display: "flex", alignItems: "center", justifyContent: "center", border: "2px dashed var(--border-strong)", background: "transparent", cursor: "pointer" }}>
          <div style={{ textAlign: "center", color: "var(--ink-faint)" }}>
            <Plus size={18} style={{ margin: "0 auto 6px" }} />
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>{t.addCustom}</div>
          </div>
        </Card>
      </div>
    </ModuleShell>
  );
}

/* ============================================================================
   REAL MODEL RESULTS — embedded from the actual training run in
   train_churn_model.py (see the downloadable script). These are the honest,
   held-out-test-set numbers; nothing here is invented.
   ============================================================================ */
const REAL_CHURN_METRICS = {
  model: "random_forest",
  dataset: "IBM Watson Telco Customer Churn (real dataset, n=7043)",
  source: "github.com/IBM/telco-customer-churn-on-icp4d",
  train_size: 5634,
  test_size: 1409,
  churn_rate: 0.2654,
  decision_threshold: 0.6,
  accuracy: 0.7828,
  precision: 0.5762,
  recall: 0.6872,
  f1: 0.6268,
  roc_auc: 0.8449,
};
const REAL_CONFUSION_MATRIX = { labels: ["No churn", "Churn"], matrix: [[846, 189], [117, 257]] };
const REAL_ROC_CURVE = [
  { fpr: 0.0, tpr: 0.0 }, { fpr: 0.0039, tpr: 0.0722 }, { fpr: 0.0087, tpr: 0.123 }, { fpr: 0.0145, tpr: 0.1791 },
  { fpr: 0.0213, tpr: 0.2139 }, { fpr: 0.028, tpr: 0.2567 }, { fpr: 0.0338, tpr: 0.2914 }, { fpr: 0.0406, tpr: 0.3209 },
  { fpr: 0.0512, tpr: 0.361 }, { fpr: 0.0589, tpr: 0.377 }, { fpr: 0.0657, tpr: 0.4198 }, { fpr: 0.0734, tpr: 0.4519 },
  { fpr: 0.0812, tpr: 0.4813 }, { fpr: 0.0899, tpr: 0.516 }, { fpr: 0.1014, tpr: 0.5428 }, { fpr: 0.1101, tpr: 0.5615 },
  { fpr: 0.1169, tpr: 0.5802 }, { fpr: 0.1295, tpr: 0.6016 }, { fpr: 0.1498, tpr: 0.6176 }, { fpr: 0.1556, tpr: 0.6337 },
  { fpr: 0.1671, tpr: 0.6497 }, { fpr: 0.1768, tpr: 0.6791 }, { fpr: 0.1884, tpr: 0.7059 }, { fpr: 0.2, tpr: 0.7246 },
  { fpr: 0.2097, tpr: 0.746 }, { fpr: 0.2251, tpr: 0.7594 }, { fpr: 0.2329, tpr: 0.7781 }, { fpr: 0.2638, tpr: 0.7941 },
  { fpr: 0.2763, tpr: 0.8102 }, { fpr: 0.3053, tpr: 0.8289 }, { fpr: 0.3217, tpr: 0.8422 }, { fpr: 0.3295, tpr: 0.8556 },
  { fpr: 0.3739, tpr: 0.877 }, { fpr: 0.4116, tpr: 0.8904 }, { fpr: 0.4338, tpr: 0.9118 }, { fpr: 0.4599, tpr: 0.9251 },
  { fpr: 0.4812, tpr: 0.9412 }, { fpr: 0.5304, tpr: 0.9572 }, { fpr: 0.5855, tpr: 0.9706 }, { fpr: 0.6773, tpr: 0.9866 },
  { fpr: 0.8995, tpr: 1.0 },
];
const REAL_FEATURE_IMPORTANCE = [
  { feature: "Contract: month-to-month", importance: 0.1826 },
  { feature: "Tenure", importance: 0.1212 },
  { feature: "Total charges", importance: 0.0827 },
  { feature: "Contract: two year", importance: 0.0756 },
  { feature: "No online security", importance: 0.0718 },
  { feature: "No tech support", importance: 0.0615 },
  { feature: "Fiber optic internet", importance: 0.0583 },
  { feature: "Monthly charges", importance: 0.0516 },
];

/* ============================================================================
   AUTH — real login against the backend (Postgres-verified password,
   signed JWT). Token persists in localStorage so a refresh doesn't log
   you out; validity is re-checked against the backend (GET /api/auth/me)
   on every app load rather than just trusted blindly.
   ============================================================================ */
async function loginRequest(username, password) {
  // Not routed through apiRequest on purpose: a wrong password is also an
  // HTTP 401, and apiRequest treats "401 while holding a token" as session
  // expiry. There is no token here, but keeping login self-contained makes that
  // impossible to break later. It still gets the same two error fixes.
  let res;
  try {
    res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    throw new Error(NETWORK_ERROR[currentLang()]);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(messageFromDetail(data, currentLang() === "ar" ? "فشل تسجيل الدخول." : "Login failed."));
  return data; // { access_token, user }
}

// Returns the user for a valid token, null ONLY when the server says the token
// is invalid/expired (401), and THROWS for anything else. That distinction is
// what fixes the stuck-spinner bug: "server unreachable" and "token rejected"
// used to be indistinguishable — and the unreachable case was never caught, so
// the startup check never finished and the app sat on a blank spinner forever.
async function fetchCurrentUser(token) {
  // 10s cap: a server that accepts the connection but never answers would
  // otherwise leave the startup spinner up indefinitely, same as the crash.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (res.status === 401) return null;
    if (!res.ok) throw new Error(`Server error (${res.status})`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const serverDownText = {
  en: { title: "Can't reach the server", body: "OmniCore couldn't verify your session because the backend isn't responding. You're still signed in — nothing was lost. Check that the services are running, then retry.", retry: "Retry", retrying: "Checking…" },
  ar: { title: "تعذّر الاتصال بالخادم", body: "لم يتمكن أومنيكور من التحقق من جلستك لأن الخادم لا يستجيب. ما زلت مسجَّل الدخول ولم يُفقد شيء. تأكد من أن الخدمات تعمل ثم أعد المحاولة.", retry: "إعادة المحاولة", retrying: "جارٍ التحقق…" },
};

function ServerDown({ lang, setLang, onRetry }) {
  const t = serverDownText[lang];
  const [busy, setBusy] = useState(false);
  const retry = () => { setBusy(true); onRetry(); };
  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="oc-preauth" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "var(--cream)" }}>
      <style>{PREAUTH_TOKENS}</style>
      <div role="alert" className="oc-fade-up" style={{ width: "100%", maxWidth: 420, textAlign: "center", background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 16, padding: "30px 26px", boxShadow: "0 1px 2px rgba(58,10,16,0.04)" }}>
        <div style={{ width: 46, height: 46, borderRadius: 13, background: "var(--red-soft)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          <AlertTriangle size={22} color="var(--red-dark)" />
        </div>
        <div className="oc-display" style={{ fontSize: 19, fontWeight: 700, color: "var(--maroon)" }}>{t.title}</div>
        <p style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.6, margin: "10px 0 20px" }}>{t.body}</p>
        <button onClick={retry} disabled={busy} className="oc-focusable" style={{
          display: "inline-flex", alignItems: "center", gap: 7, background: busy ? "var(--border-strong)" : "var(--red)", color: "#fff", border: "none",
          borderRadius: 10, padding: "10px 20px", fontSize: 13.5, fontWeight: 700, cursor: busy ? "wait" : "pointer",
        }}>
          {busy ? <Loader2 size={15} className="oc-pulse-dot" /> : <RefreshCw size={15} />} {busy ? t.retrying : t.retry}
        </button>
        <div style={{ marginTop: 16 }}>
          <button onClick={() => setLang(lang === "en" ? "ar" : "en")} className="oc-focusable" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-faint)", fontSize: 12, fontWeight: 600 }}>
            {lang === "en" ? "العربية" : "English"}
          </button>
        </div>
      </div>
    </div>
  );
}

const authText = {
  en: { title: "OmniCore AI", subtitle: "Sign in to continue", username: "Username", password: "Password",
    signIn: "Sign in", signingIn: "Signing in…", demoNote: "Demo accounts", demoAdmin: "admin / admin123 (Platform Admin)",
    demoAnalyst: "analyst / analyst123 (Analyst)", checking: "Checking your session…",
  },
  ar: { title: "أومنيكور إيه آي", subtitle: "سجّل الدخول للمتابعة", username: "اسم المستخدم", password: "كلمة المرور",
    signIn: "تسجيل الدخول", signingIn: "جارٍ تسجيل الدخول…", demoNote: "حسابات تجريبية", demoAdmin: "admin / admin123 (مسؤول المنصة)",
    demoAnalyst: "analyst / analyst123 (محلّل)", checking: "جارٍ التحقق من جلستك…",
  },
};

function LoginScreen({ lang, setLang, onLogin, onBack, notice }) {
  const t = authText[lang];
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const data = await loginRequest(username, password);
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={dir} className="oc-preauth" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "var(--cream)" }}>
      <style>{PREAUTH_TOKENS}</style>
      {onBack && (
        <button onClick={onBack} className="oc-focusable" style={{
          position: "fixed", top: 18, insetInlineStart: 18, display: "flex", alignItems: "center", gap: 6,
          background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 99, padding: "6px 12px",
          fontSize: 12.5, fontWeight: 700, cursor: "pointer", color: "var(--maroon)",
        }}>
          <BackIcon size={13} /> {lang === "ar" ? "الرئيسية" : "Back"}
        </button>
      )}
      <button onClick={() => setLang(lang === "en" ? "ar" : "en")} className="oc-focusable" style={{
        position: "fixed", top: 18, insetInlineEnd: 18, display: "flex", alignItems: "center", gap: 6,
        background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 99, padding: "6px 12px",
        fontSize: 12.5, fontWeight: 700, cursor: "pointer", color: "var(--maroon)",
      }}>
        <Globe size={13} /> {lang === "en" ? "العربية" : "English"}
      </button>
      <div className="oc-fade-up" style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 13, background: "linear-gradient(135deg, #3A0A10, #C81E33)",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px",
          }}>
            <Zap size={24} color="#fff" />
          </div>
          <div className="oc-display" style={{ fontSize: 21, fontWeight: 700, color: "var(--maroon)" }}>{t.title}</div>
          <div style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 4 }}>{t.subtitle}</div>
        </div>
        <div style={{ background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, boxShadow: "0 1px 2px rgba(58,10,16,0.04)" }}>
          <form onSubmit={submit}>
            {notice && (
              <div role="status" style={{ fontSize: 12.5, color: "var(--maroon)", background: "var(--tan-soft)", border: "1px solid var(--border-strong)", borderRadius: 8, padding: "8px 10px", marginBottom: 14, lineHeight: 1.5 }}>{notice}</div>
            )}
            <label htmlFor="oc-login-username" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", display: "block", marginBottom: 5 }}>{t.username}</label>
            <input id="oc-login-username" name="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus className="oc-focusable"
              style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 13px", fontSize: 14, background: "var(--cream)", marginBottom: 14 }} />
            <label htmlFor="oc-login-password" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", display: "block", marginBottom: 5 }}>{t.password}</label>
            <input id="oc-login-password" name="password" autoComplete="current-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="oc-focusable"
              style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 13px", fontSize: 14, background: "var(--cream)", marginBottom: 16 }} />
            {error && <div role="alert" style={{ fontSize: 12.5, color: "#8C1023", background: "var(--red-soft)", borderRadius: 8, padding: "8px 10px", marginBottom: 14 }}>{error}</div>}
            <button type="submit" disabled={loading || !username.trim() || !password} className="oc-focusable" style={{
              width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
              background: (loading || !username.trim() || !password) ? "var(--border-strong)" : "var(--red)", color: "#fff", border: "none",
              borderRadius: 10, padding: "11px 15px", fontSize: 13.5, fontWeight: 700,
              cursor: (loading || !username.trim() || !password) ? "not-allowed" : "pointer",
            }}>
              {loading && <Loader2 size={15} className="oc-pulse-dot" />}
              {loading ? t.signingIn : t.signIn}
            </button>
          </form>
        </div>
        <div style={{ marginTop: 16, textAlign: "center", fontSize: 11.5, color: "var(--ink-faint)", lineHeight: 1.7 }}>
          {t.demoNote}: <span className="oc-mono">{t.demoAdmin}</span> · <span className="oc-mono">{t.demoAnalyst}</span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   MODULE: TRADE & REGULATORY INTELLIGENCE

   Sources-first by design. Retrieval against official government portals
   returns in seconds and is the substance of the module; the AI summary is
   opt-in behind an explicit warning because CPU-hosted generation on this
   stack runs at roughly 2.4 tokens/sec (measured), which makes a cited
   paragraph a multi-minute wait. Showing citations immediately and letting
   the reader decide whether the prose is worth the wait is both faster and
   more honest than a spinner that looks broken.
   ============================================================================ */
const tradeText = {
  en: {
    eyebrow: "Module 13", title: "Trade & Regulatory Intelligence",
    desc: "Ask a cross-border trade or business-law question. Answers are retrieved live from official government portals and cited — never written from the model's memory.",
    placeholder: "e.g. What are the cosmetics import registration requirements?",
    jurisdictions: "Jurisdictions", sector: "Sector", search: "Find sources", searching: "Retrieving…",
    sources: "Retrieved sources", official: "Official", unofficial: "Unofficial",
    officialNote: "government or treaty body", unofficialNote: "not a government source — verify",
    directory: "Official directory", directoryDesc: "Hand-verified entry points. Always available, even if live search is throttled.",
    summarize: "Summarize with AI", summarizing: "Writing summary…",
    summarizeWarn: "Runs on the self-hosted CPU model — expect several minutes, and it may time out on modest hardware.",
    aiSummary: "AI summary", noResults: "No sources retrieved. Try broadening the question, or use the directory below.",
    empty: "Ask a question to retrieve official sources.",
    disclaimer: "Retrieval summary, not legal advice. Regulations change — verify against the primary source before acting.",
    searchedNote: "Searched", pickOne: "Select at least one jurisdiction.",
    webNote: "Your question is sent to public search engines (via the self-hosted SearXNG) to find official sources. 3–500 characters.",
  },
  ar: {
    eyebrow: "الوحدة 13", title: "التجارة والذكاء التنظيمي",
    desc: "اطرح سؤالًا عن التجارة عبر الحدود أو قانون الأعمال. تُسترجع الإجابات مباشرة من البوابات الحكومية الرسمية مع التوثيق — ولا تُكتب من ذاكرة النموذج.",
    placeholder: "مثال: ما متطلبات تسجيل استيراد مستحضرات التجميل؟",
    jurisdictions: "الولايات القضائية", sector: "القطاع", search: "ابحث عن المصادر", searching: "جارٍ الاسترجاع…",
    sources: "المصادر المسترجَعة", official: "رسمي", unofficial: "غير رسمي",
    officialNote: "جهة حكومية أو دولية", unofficialNote: "ليس مصدرًا حكوميًا — تحقّق",
    directory: "الدليل الرسمي", directoryDesc: "نقاط دخول موثّقة يدويًا. متاحة دائمًا حتى لو تعذّر البحث المباشر.",
    summarize: "لخّص بالذكاء الاصطناعي", summarizing: "جارٍ كتابة الملخّص…",
    summarizeWarn: "يعمل على نموذج المعالج المستضاف ذاتيًا — توقّع عدة دقائق، وقد تنتهي المهلة على أجهزة متواضعة.",
    aiSummary: "ملخّص الذكاء الاصطناعي", noResults: "لم تُسترجع أي مصادر. جرّب توسيع السؤال أو استخدم الدليل أدناه.",
    empty: "اطرح سؤالًا لاسترجاع المصادر الرسمية.",
    disclaimer: "ملخّص استرجاعي وليس استشارة قانونية. الأنظمة تتغيّر — تحقّق من المصدر الأساسي قبل التصرّف.",
    searchedNote: "تم البحث في", pickOne: "اختر ولاية قضائية واحدة على الأقل.",
    webNote: "يُرسَل سؤالك إلى محركات بحث عامة (عبر SearXNG المستضاف ذاتيًا) للعثور على مصادر رسمية. من 3 إلى 500 حرف.",
  },
};

function TradeIntelligence({ lang, token, logActivity }) {
  const t = tradeText[lang];
  const [registry, setRegistry] = useState({ jurisdictions: [], sectors: [] });
  const [question, setQuestion] = useState("");
  const [picked, setPicked] = useState(["uae"]);
  const [sector, setSector] = useState("general");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch("/api/trade/sources").then(setRegistry).catch(() => {});
  }, []);

  const toggleJurisdiction = (key) =>
    setPicked((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const run = useCallback(async (summarize) => {
    if (question.trim().length < 3) return;
    if (!picked.length) { setError(t.pickOne); return; }
    summarize ? setSummarizing(true) : setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/api/trade/research", {
        token, method: "POST",
        body: { question, jurisdictions: picked, sector, lang, summarize },
      });
      setResult(data);
      logActivity?.(`${lang === "ar" ? "بحث تنظيمي" : "Regulatory search"}: ${question.slice(0, 48)}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSummarizing(false); setLoading(false);
    }
  }, [question, picked, sector, lang, token, logActivity, t.pickOne]);

  const chip = (active) => ({
    display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
    background: active ? "var(--accent)" : "var(--surface)", color: active ? "#fff" : "var(--ink-soft)",
    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`, borderRadius: 999,
    padding: "6px 13px", fontSize: 12.5, fontWeight: 600,
  });

  return (
    <ModuleShell>
      <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc} />

      <Card>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t.placeholder}
          aria-label={t.title}
          maxLength={500}
          rows={2}
          className="oc-focusable"
          style={{
            width: "100%", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 13px",
            fontSize: 14, background: "var(--surface-sunken)", resize: "vertical", fontFamily: "inherit",
          }}
        />
        <div style={{ marginTop: 14, fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 7 }}>
          {t.jurisdictions}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {registry.jurisdictions.map((j) => (
            <button key={j.key} onClick={() => toggleJurisdiction(j.key)} className="oc-focusable"
              style={chip(picked.includes(j.key))}>
              {picked.includes(j.key) && <CheckCircle2 size={12} />}
              {lang === "ar" ? j.label_ar : j.label}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 14, fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 7 }}>
          {t.sector}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {registry.sectors.map((s) => (
            <button key={s.key} onClick={() => setSector(s.key)} className="oc-focusable"
              style={chip(sector === s.key)}>
              {lang === "ar" ? s.label_ar : s.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 9, marginTop: 16, flexWrap: "wrap" }}>
          <PrimaryButton onClick={() => run(false)} disabled={loading || summarizing || question.trim().length < 3}
            icon={loading ? Loader2 : Search}>
            {loading ? t.searching : t.search}
          </PrimaryButton>
          {result?.citations?.length > 0 && (
            <GhostButton onClick={() => run(true)} icon={summarizing ? Loader2 : Sparkles}>
              {summarizing ? t.summarizing : t.summarize}
            </GhostButton>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 9, lineHeight: 1.5 }}>
          {t.webNote} <span className="oc-mono">{question.length}/500</span>
        </div>
        {result?.citations?.length > 0 && !result.answer && (
          <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 6, lineHeight: 1.5 }}>
            {t.summarizeWarn}
          </div>
        )}
        {error && (
          <div style={{ fontSize: 12.5, color: "var(--danger)", background: "var(--danger-soft)",
                        borderRadius: 8, padding: "8px 10px", marginTop: 12 }}>{error}</div>
        )}
      </Card>

      {result?.answer && (
        <div style={{ marginTop: 14 }}>
          <AIInsightPanel lang={lang} loading={false} text={result.answer} label={t.aiSummary}
            onRegenerate={() => run(true)} />
        </div>
      )}

      {result && (
        <div style={{ marginTop: 14 }}>
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{t.sources}</div>
              {result.citations.length > 0 && (
                <Badge tone="accent" icon={BadgeCheck}>
                  {result.official_count}/{result.citations.length} {t.official}
                </Badge>
              )}
            </div>
            {result.citations.length === 0 ? (
              <div style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>{t.noResults}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {result.citations.map((c) => (
                  <a key={c.n} href={c.url} target="_blank" rel="noopener noreferrer"
                    className="oc-focusable"
                    style={{
                      display: "block", textDecoration: "none", color: "inherit",
                      border: `1px solid ${c.official ? "var(--accent)" : "var(--border)"}`,
                      background: c.official ? "var(--accent-soft)" : "var(--surface-sunken)",
                      borderRadius: 11, padding: "11px 13px",
                    }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span className="oc-mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-faint)" }}>[{c.n}]</span>
                      <Badge tone={c.official ? "success" : "neutral"} icon={c.official ? BadgeCheck : undefined}>
                        {c.official ? t.official : t.unofficial}
                      </Badge>
                      <span style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>
                        {c.source_name} · {c.jurisdiction}
                      </span>
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4 }}>{c.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4, fontSize: 11.5, color: "var(--accent)" }}>
                      <ExternalLink size={11} /> {c.url.slice(0, 76)}{c.url.length > 76 ? "…" : ""}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {result?.directory?.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <Landmark size={15} color="var(--accent)" />
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{t.directory}</div>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 12 }}>{t.directoryDesc}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 9 }}>
              {result.directory.map((d, i) => (
                <a key={i} href={d.url} target="_blank" rel="noopener noreferrer" className="oc-focusable"
                  style={{
                    textDecoration: "none", color: "inherit", border: "1px solid var(--border)",
                    borderRadius: 11, padding: "10px 12px", background: "var(--surface)",
                  }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{d.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--accent)", marginTop: 2 }}>{d.body}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 4, lineHeight: 1.45 }}>{d.note}</div>
                </a>
              ))}
            </div>
          </Card>
        </div>
      )}

      {!result && (
        <div style={{ marginTop: 14 }}>
          <Card><div style={{ fontSize: 13.5, color: "var(--ink-faint)" }}>{t.empty}</div></Card>
        </div>
      )}

      {result && (
        <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 12, lineHeight: 1.6 }}>
          {t.disclaimer}
          {result.searched?.length > 0 && <> · {t.searchedNote}: {result.searched.join(", ")}</>}
        </div>
      )}
    </ModuleShell>
  );
}

/* ============================================================================
   MODULE: PROFILE

   Reads the signed-in identity from the backend (/api/auth/me) rather than
   from local state, so what's displayed is what the server actually accepts
   for this token — a stale or forged local value can't make the UI claim a
   role the API wouldn't honour.
   ============================================================================ */
const profileText = {
  en: {
    eyebrow: "Account", title: "Your profile", desc: "Identity, role and what that role can reach.",
    identity: "Identity", username: "Username", fullName: "Full name", role: "Role",
    verified: "Verified against the backend", verifying: "Verifying…", verifyFailed: "Could not verify session",
    permissions: "What your role can access", allowed: "Allowed", restricted: "Restricted",
    adminOnlyLabel: "Platform Admin only",
    activity: "Your recent activity", noActivity: "Nothing recorded yet.",
    session: "Session", signOut: "Sign out",
    adminNote: "You have Platform Admin access — Security & Governance and the full audit log are visible to you.",
    analystNote: "You're signed in as an Analyst. Security & Governance is restricted to Platform Admins.",
  },
  ar: {
    eyebrow: "الحساب", title: "ملفك الشخصي", desc: "الهوية والدور وما يمكن لهذا الدور الوصول إليه.",
    identity: "الهوية", username: "اسم المستخدم", fullName: "الاسم الكامل", role: "الدور",
    verified: "تم التحقق من الخادم", verifying: "جارٍ التحقق…", verifyFailed: "تعذّر التحقق من الجلسة",
    permissions: "ما يمكن لدورك الوصول إليه", allowed: "مسموح", restricted: "مقيّد",
    adminOnlyLabel: "لمسؤولي المنصة فقط",
    activity: "نشاطك الأخير", noActivity: "لم يُسجَّل شيء بعد.",
    session: "الجلسة", signOut: "تسجيل الخروج",
    adminNote: "لديك صلاحية مسؤول المنصة — الأمان والحوكمة وسجل التدقيق الكامل مرئية لك.",
    analystNote: "أنت مسجَّل الدخول كمحلّل. الأمان والحوكمة مقتصر على مسؤولي المنصة.",
  },
};

function ProfileModule({ lang, user, token, onLogout }) {
  const t = profileText[lang];
  const c = commonText[lang];
  const [verified, setVerified] = useState(null);   // null = checking
  const [events, setEvents] = useState([]);
  const isAdmin = user?.role === "Platform Admin";

  useEffect(() => {
    apiFetch("/api/auth/me", { token }).then(setVerified).catch(() => setVerified(false));
    apiFetch("/api/workspace/events?limit=8", { token }).then(setEvents).catch(() => setEvents([]));
  }, [token]);

  const initials = (user?.full_name || user?.username || "?")
    .split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const rows = [
    { label: t.username, value: user?.username },
    { label: t.fullName, value: user?.full_name },
    { label: t.role, value: user?.role },
  ];

  return (
    <ModuleShell>
      <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc} />

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 15, flexWrap: "wrap" }}>
          <div style={{
            width: 58, height: 58, borderRadius: 16, flexShrink: 0,
            background: isAdmin ? "linear-gradient(135deg, #0C8479, #2DD4BF)" : "var(--surface-sunken)",
            color: isAdmin ? "#fff" : "var(--ink-soft)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 700, fontFamily: "var(--font-display)",
          }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="oc-display" style={{ fontSize: 19, fontWeight: 700 }}>{user?.full_name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              <Badge tone={isAdmin ? "accent" : "neutral"} icon={isAdmin ? ShieldCheck : Users}>
                {user?.role}
              </Badge>
              {verified === null && <Badge tone="neutral" icon={Loader2}>{t.verifying}</Badge>}
              {verified && <Badge tone="success" icon={BadgeCheck}>{t.verified}</Badge>}
              {verified === false && <Badge tone="danger" icon={AlertTriangle}>{t.verifyFailed}</Badge>}
            </div>
          </div>
          <GhostButton onClick={onLogout} icon={LogOut}>{t.signOut}</GhostButton>
        </div>

        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {rows.map((r) => (
            <div key={r.label} style={{ background: "var(--surface-sunken)", borderRadius: 11, padding: "10px 13px" }}>
              <div style={{ fontSize: 11.5, color: "var(--ink-faint)", fontWeight: 600 }}>{r.label}</div>
              <div className="oc-mono" style={{ fontSize: 13.5, fontWeight: 600, marginTop: 3 }}>{r.value}</div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ marginTop: 14 }}>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 3 }}>{t.permissions}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 12 }}>
            {isAdmin ? t.adminNote : t.analystNote}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 9 }}>
            {NAV_ITEMS.map((n) => {
              const adminOnly = n.key === "security";
              const ok = !adminOnly || isAdmin;
              return (
                <div key={n.key} style={{
                  display: "flex", alignItems: "center", gap: 9,
                  border: "1px solid var(--border)", borderRadius: 10, padding: "9px 11px",
                  background: ok ? "var(--surface)" : "var(--surface-sunken)", opacity: ok ? 1 : 0.72,
                }}>
                  <n.icon size={15} color={ok ? "var(--accent)" : "var(--ink-faint)"} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{lang === "ar" ? n.ar : n.en}</div>
                    {adminOnly && (
                      <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{t.adminOnlyLabel}</div>
                    )}
                  </div>
                  {ok ? <CheckCircle2 size={14} color="var(--success)" />
                      : <KeyRound size={14} color="var(--ink-faint)" />}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 14 }}>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 12 }}>{t.activity}</div>
          {events.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--ink-faint)" }}>{t.noActivity}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {events.map((e) => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                  <CircleDot size={11} color="var(--accent)" />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontWeight: 600 }}>{e.module}</strong> · {e.action}
                    {e.detail && <span style={{ color: "var(--ink-faint)" }}> — {e.detail}</span>}
                  </span>
                  <span className="oc-mono" style={{ fontSize: 11.5, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>
                    {new Date(e.created_at).toLocaleString(lang === "ar" ? "ar-SA" : "en-US",
                      { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </ModuleShell>
  );
}

/* ============================================================================
   MODULE: SETTINGS
   ============================================================================ */
const settingsText = {
  en: { title: "Settings", desc: "Account, language, and session data.",
    account: "Account", role: "Role", username: "Username",
    language: "Language", languageDesc: "Switches the whole interface, including layout direction.",
    sessionData: "Session data", sessionDataDesc: "Everything below lives in this browser session only — nothing survives a refresh except your login.",
    docsInKb: "Knowledge base snippets", chatTurns: "Chat messages", activityEntries: "Logged activities",
    clearSession: "Clear session data", clearedNote: "Session data cleared.",
    about: "About", version: "Version", backend: "Backend status", checking: "Checking…", online: "Online", offline: "Unreachable",
  },
  ar: { title: "الإعدادات", desc: "الحساب واللغة وبيانات الجلسة.",
    account: "الحساب", role: "الدور", username: "اسم المستخدم",
    language: "اللغة", languageDesc: "يبدّل الواجهة بالكامل، بما في ذلك اتجاه التخطيط.",
    sessionData: "بيانات الجلسة", sessionDataDesc: "كل ما يلي موجود في جلسة المتصفح هذه فقط — لا يبقى شيء بعد التحديث سوى تسجيل دخولك.",
    docsInKb: "مقتطفات قاعدة المعرفة", chatTurns: "رسائل الدردشة", activityEntries: "الأنشطة المسجَّلة",
    clearSession: "مسح بيانات الجلسة", clearedNote: "تم مسح بيانات الجلسة.",
    about: "حول", version: "الإصدار", backend: "حالة الخادم", checking: "جارٍ التحقق…", online: "متصل", offline: "غير متاح",
  },
};

function SettingsModule({ lang, setLang, user, knowledgeBase, setKnowledgeBase, chatMessages, setChatMessages, activityLog, setActivityLog }) {
  const t = settingsText[lang];
  const [cleared, setCleared] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");

  useEffect(() => {
    fetch(`${API_BASE}/health`).then((r) => setBackendStatus(r.ok ? "online" : "offline")).catch(() => setBackendStatus("offline"));
  }, []);

  const clearSession = () => {
    setKnowledgeBase([]); setChatMessages([]); setActivityLog([]);
    setCleared(true);
    setTimeout(() => setCleared(false), 2500);
  };

  return (
    <ModuleShell>
      <SectionHeader title={t.title} description={t.desc} />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 12 }}>{t.account}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 99, background: "var(--ink)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
              {(user?.full_name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{user?.full_name}</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>@{user?.username} · {user?.role}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 2 }}>{t.language}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 12 }}>{t.languageDesc}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <GhostButton active={lang === "en"} onClick={() => setLang("en")}>English</GhostButton>
            <GhostButton active={lang === "ar"} onClick={() => setLang("ar")}>العربية</GhostButton>
          </div>
        </Card>

        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 2 }}>{t.sessionData}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 12 }}>{t.sessionDataDesc}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
            <div style={{ background: "var(--surface-sunken)", borderRadius: 10, padding: 12, textAlign: "center" }}>
              <div className="oc-mono" style={{ fontSize: 20, fontWeight: 700 }}>{knowledgeBase.length}</div>
              <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>{t.docsInKb}</div>
            </div>
            <div style={{ background: "var(--surface-sunken)", borderRadius: 10, padding: 12, textAlign: "center" }}>
              <div className="oc-mono" style={{ fontSize: 20, fontWeight: 700 }}>{chatMessages.length}</div>
              <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>{t.chatTurns}</div>
            </div>
            <div style={{ background: "var(--surface-sunken)", borderRadius: 10, padding: 12, textAlign: "center" }}>
              <div className="oc-mono" style={{ fontSize: 20, fontWeight: 700 }}>{activityLog.length}</div>
              <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>{t.activityEntries}</div>
            </div>
          </div>
          <GhostButton onClick={clearSession} icon={cleared ? CheckCircle2 : Trash2}>{cleared ? t.clearedNote : t.clearSession}</GhostButton>
        </Card>

        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 12 }}>{t.about}</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
            <span style={{ color: "var(--ink-soft)" }}>{t.version}</span><span className="oc-mono">0.1.0</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0" }}>
            <span style={{ color: "var(--ink-soft)" }}>{t.backend}</span>
            <Badge tone={backendStatus === "online" ? "success" : backendStatus === "offline" ? "danger" : "neutral"}>
              {backendStatus === "checking" ? t.checking : backendStatus === "online" ? t.online : t.offline}
            </Badge>
          </div>
        </Card>
      </div>
    </ModuleShell>
  );
}

/* ============================================================================
   SHELL: SIDEBAR
   ============================================================================ */
function Sidebar({ lang, activeModule, setActiveModule, collapsed, mobileOpen, setMobileOpen }) {
  const c = commonText[lang];
  const groups = ["overview", "ai", "data", "ops"];
  return (
    <>
      <div className={`oc-sidebar-backdrop ${mobileOpen ? "show" : ""}`} onClick={() => setMobileOpen(false)} />
      <aside className={`oc-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #0C8479, #2DD4BF)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Zap size={16} color="#fff" />
          </div>
          {!collapsed && (
            <div className="oc-display" style={{ color: "#fff", fontSize: 14.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.appName}</div>
          )}
          <button onClick={() => setMobileOpen(false)} className="oc-focusable oc-sidebar-close" style={{ marginInlineStart: "auto", background: "none", border: "none", color: "var(--rail-ink-dim)", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>
        <nav className="oc-scroll" style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
          {groups.map((g) => (
            <div key={g} style={{ marginBottom: 16 }}>
              {!collapsed && <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--rail-ink-dim)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 10px", marginBottom: 6 }}>{GROUP_LABEL[lang][g]}</div>}
              {NAV_ITEMS.filter((n) => n.group === g).map((n) => {
                const active = activeModule === n.key;
                const Icon = n.icon;
                return (
                  <button key={n.key} onClick={() => { setActiveModule(n.key); setMobileOpen(false); }} className="oc-focusable"
                    title={collapsed ? (lang === "ar" ? n.ar : n.en) : undefined}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px", borderRadius: 9, border: "none",
                      background: active ? "var(--rail-active)" : "transparent", color: active ? "#fff" : "var(--rail-ink)",
                      fontSize: 13.5, fontWeight: active ? 600 : 500, cursor: "pointer", marginBottom: 2, textAlign: "start",
                      borderInlineStart: active ? "2px solid var(--accent)" : "2px solid transparent",
                    }}>
                    <Icon size={16} style={{ flexShrink: 0 }} />
                    {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{lang === "ar" ? n.ar : n.en}</span>}
                    {!collapsed && n.live && <span title="Live" style={{ width: 6, height: 6, borderRadius: 99, background: "var(--accent)", flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        {!collapsed && (
          <div style={{ padding: 14, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--rail-ink-dim)", fontSize: 11 }}>
              <Sparkles size={12} color="var(--spark)" />
              {commonText[lang].poweredByClaude}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

/* ============================================================================
   SHELL: TOPBAR
   ============================================================================ */
function TopBar({ lang, setLang, activeModuleLabel, mobileOpen, setMobileOpen, collapsed, setCollapsed, user, onLogout, onOpenSettings, onOpenProfile }) {
  const c = commonText[lang];
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleSidebar = () => {
    if (window.innerWidth <= 900) setMobileOpen((o) => !o);
    else setCollapsed((v) => !v);
  };
  const initials = (user?.full_name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <header style={{
      height: 60, borderBottom: "1px solid var(--border)", background: "var(--surface)", display: "flex",
      alignItems: "center", gap: 10, padding: "0 18px", flexShrink: 0, position: "sticky", top: 0, zIndex: 20,
    }}>
      <button onClick={toggleSidebar} className="oc-focusable" title={collapsed || mobileOpen ? c.expand : c.collapse}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink)", display: "flex", padding: 4, borderRadius: 8 }}>
        <Menu size={21} />
      </button>
      <div className="oc-display" style={{ fontWeight: 700, fontSize: 15, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {activeModuleLabel}
      </div>
      <button onClick={() => setLang(lang === "en" ? "ar" : "en")} className="oc-focusable" style={{
        display: "flex", alignItems: "center", gap: 6, background: "var(--surface-sunken)", border: "1px solid var(--border)",
        borderRadius: 99, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", color: "var(--ink)",
      }}>
        <Globe size={13} /> {lang === "en" ? "العربية" : "English"}
      </button>
      <button onClick={onOpenSettings} className="oc-focusable" title={commonText[lang].settings}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)", display: "flex" }}>
        <Settings size={19} />
      </button>
      <button className="oc-focusable" style={{ background: "none", border: "none", cursor: "pointer", position: "relative", color: "var(--ink-soft)", display: "flex" }}>
        <Bell size={19} />
        <span style={{ position: "absolute", top: -1, insetInlineEnd: -1, width: 8, height: 8, borderRadius: 99, background: "var(--spark)", border: "2px solid var(--surface)" }} />
      </button>
      <div style={{ position: "relative" }}>
        <button onClick={() => setMenuOpen((o) => !o)} className="oc-focusable" style={{
          width: 32, height: 32, borderRadius: 99, background: "var(--ink)", color: "#fff", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0,
        }}>
          {initials}
        </button>
        {menuOpen && (
          <>
            <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 29 }} />
            <div className="oc-fade-up" style={{
              position: "absolute", insetInlineEnd: 0, top: 40, background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 180, zIndex: 30, overflow: "hidden",
            }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{user?.full_name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--ink-faint)", marginTop: 2 }}>
                  {user?.role === "Platform Admin" ? <ShieldCheck size={11} color="var(--accent)" /> : <Users size={11} />}
                  {user?.role}
                </div>
              </div>
              <button onClick={() => { setMenuOpen(false); onOpenProfile(); }} className="oc-focusable" style={{
                width: "100%", textAlign: "start", padding: "9px 14px", background: "none", border: "none", cursor: "pointer",
                fontSize: 13, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8,
              }}>
                <Users size={14} /> {lang === "ar" ? "الملف الشخصي" : "Profile"}
              </button>
              <button onClick={onLogout} className="oc-focusable" style={{
                width: "100%", textAlign: "start", padding: "9px 14px", background: "none", border: "none", cursor: "pointer",
                fontSize: 13, color: "var(--danger)", display: "flex", alignItems: "center", gap: 8,
              }}>
                <LogOut size={14} /> {commonText[lang].logout}
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

/* ============================================================================
   ROOT APP
   ============================================================================ */
function OmniCoreAI() {
  const [lang, setLang] = useState("en");
  const [activeModule, setActiveModule] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [imageAnalysesCount, setImageAnalysesCount] = useState(0);

  // --- Auth state ---
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [sessionError, setSessionError] = useState(false);   // backend unreachable at startup
  const [sessionNotice, setSessionNotice] = useState(null);  // e.g. "your session expired"
  const [showAuthForm, setShowAuthForm] = useState(false);

  // On load: if a token was saved from a previous visit, verify it against
  // the backend (not just trusted as-is) before treating the user as logged in.
  //
  // Three outcomes, deliberately distinct:
  //   valid token        -> signed in
  //   401 (null)         -> discard the token, show the landing page
  //   anything else/throw-> the SERVER is the problem, not the token: keep the
  //                         token and show a retry screen. Previously the throw
  //                         was uncaught, setSessionChecked(true) never ran, and
  //                         the app sat on a blank spinner forever.
  const checkSession = useCallback(() => {
    const saved = localStorage.getItem("omnicore_token");
    if (!saved) { setSessionChecked(true); return; }
    setSessionError(false);
    setSessionChecked(false);
    fetchCurrentUser(saved)
      .then((u) => {
        if (u) { setAuthToken(saved); setToken(saved); setUser(u); }
        else localStorage.removeItem("omnicore_token"); // expired/invalid — discard it
      })
      .catch(() => setSessionError(true))
      .finally(() => setSessionChecked(true));
  }, []);

  useEffect(() => { checkSession(); }, [checkSession]);

  const handleLogin = useCallback(({ access_token, user }) => {
    localStorage.setItem("omnicore_token", access_token);
    setAuthToken(access_token);
    setSessionNotice(null);
    setToken(access_token);
    setUser(user);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("omnicore_token");
    setAuthToken(null);
    setToken(null); setUser(null);
    setActiveModule("dashboard");
  }, []);

  // Any API call that comes back 401 while we hold a token means the session
  // ended (expiry, or the server secret changed). Sign out and say why,
  // instead of leaving the user "logged in" with every module showing an error.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      localStorage.removeItem("omnicore_token");
      setAuthToken(null);
      setToken(null); setUser(null);
      setActiveModule("dashboard");
      setSessionNotice(lang === "ar" ? "انتهت جلستك. سجّل الدخول مرة أخرى للمتابعة." : "Your session expired. Please sign in again to continue.");
      setShowAuthForm(true);
    });
    return () => setUnauthorizedHandler(null);
  }, [lang]);

  const logActivity = useCallback((text, module = "app") => {
    setActivityLog((prev) => [
      { id: Date.now() + Math.random(), text, time: new Date().toLocaleTimeString(lang === "ar" ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" }) },
      ...prev,
    ].slice(0, 50));
    // Also persist it. Fire-and-forget: the in-session list above is what the
    // UI renders immediately, and a failed write should never interrupt the
    // action the user was actually performing. The persisted copy is what
    // feeds the dashboard trend and the audit log across sessions.
    if (token) {
      apiFetch("/api/workspace/events", {
        token, method: "POST",
        body: { module, action: "used", detail: String(text).slice(0, 380) },
      }).catch(() => {});
    }
  }, [lang, token]);

  const dir = lang === "ar" ? "rtl" : "ltr";
  useEffect(() => { document.documentElement.dir = dir; document.documentElement.lang = lang; }, [dir, lang]);

  const activeNavItem = NAV_ITEMS.find((n) => n.key === activeModule);
  const activeModuleLabel = activeModule === "dashboard" ? commonText[lang].appName
    : activeModule === "settings" ? commonText[lang].settings
    : (activeNavItem ? (lang === "ar" ? activeNavItem.ar : activeNavItem.en) : "");

  const moduleProps = {
    lang, knowledgeBase, setKnowledgeBase, chatMessages, setChatMessages, activityLog, logActivity,
    imageAnalysesCount, churnMetrics: REAL_CHURN_METRICS, confusionMatrix: REAL_CONFUSION_MATRIX,
    rocCurve: REAL_ROC_CURVE, featureImportance: REAL_FEATURE_IMPORTANCE, user, token,
    onOpenModule: setActiveModule, onAnalyzed: () => setImageAnalysesCount((n) => n + 1),
  };

  // Session still being verified against the backend — avoid a login-screen
  // flash for users who are actually already authenticated.
  if (!sessionChecked) {
    return (
      <div className="oc-root" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{TOKENS}</style>
        <div role="status" aria-live="polite" style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--ink-faint)", fontSize: 13 }}>
          <Loader2 size={22} className="oc-pulse-dot" color="var(--ink-faint)" />
          <span>{commonText[lang].checkingSession}</span>
        </div>
      </div>
    );
  }

  // The backend couldn't be reached while verifying a saved session. Keep the
  // token (the user is probably still signed in) and offer a retry, rather than
  // either spinning forever or silently signing them out.
  if (sessionError) {
    return <ServerDown lang={lang} setLang={setLang} onRetry={checkSession} />;
  }

  if (!token || !user) {
    if (!showAuthForm) {
      return <LandingPage lang={lang} setLang={setLang} onGetStarted={() => setShowAuthForm(true)} />;
    }
    return <LoginScreen lang={lang} setLang={setLang} onLogin={handleLogin} onBack={() => setShowAuthForm(false)} notice={sessionNotice} />;
  }

  return (
    <div dir={dir} className="oc-root" style={{ minHeight: "100vh" }}>
      <style>{TOKENS}</style>
      <div className="oc-app">
        <Sidebar lang={lang} activeModule={activeModule} setActiveModule={setActiveModule} collapsed={collapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <div className="oc-main">
          <TopBar lang={lang} setLang={setLang} activeModuleLabel={activeModuleLabel} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}
            collapsed={collapsed} setCollapsed={setCollapsed} user={user} onLogout={handleLogout} onOpenSettings={() => setActiveModule("settings")}
            onOpenProfile={() => setActiveModule("profile")} />
          <main className="oc-scroll oc-content-pad" style={{ flex: 1, overflowY: "auto", padding: 26, background: "var(--bg)" }}>
            {activeModule === "dashboard" && <ExecutiveDashboard {...moduleProps} />}
            {activeModule === "chat" && <AIChatAssistant {...moduleProps} />}
            {activeModule === "documents" && <DocumentIntelligence {...moduleProps} />}
            {activeModule === "vision" && <ComputerVisionPlatform {...moduleProps} />}
            {activeModule === "speech" && <SpeechAI {...moduleProps} />}
            {activeModule === "agents" && <AIAgentPlatform {...moduleProps} />}
            {activeModule === "analytics" && <PredictiveAnalytics {...moduleProps} />}
            {activeModule === "recommend" && <RecommendationEngine {...moduleProps} />}
            {activeModule === "search" && <EnterpriseSearchModule {...moduleProps} />}
            {activeModule === "trade" && <TradeIntelligence {...moduleProps} />}
            {activeModule === "profile" && <ProfileModule {...moduleProps} onLogout={handleLogout} />}
            {activeModule === "automation" && <AutomationPlatform {...moduleProps} />}
            {activeModule === "security" && <SecurityGovernance {...moduleProps} />}
            {activeModule === "plugins" && <PluginHub {...moduleProps} />}
            {activeModule === "settings" && <SettingsModule {...moduleProps} setLang={setLang} setKnowledgeBase={setKnowledgeBase} setChatMessages={setChatMessages} setActivityLog={setActivityLog} />}
          </main>
        </div>
      </div>
    </div>
  );
}

export default OmniCoreAI;
