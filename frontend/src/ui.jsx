import React, { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Sparkles, RefreshCw, X, CheckCircle2, AlertTriangle, Info, Loader2, Square } from "lucide-react";
import { NumberTicker, BorderBeam } from "./magicui.jsx";

/* ---------------------------------------------------------------------------
   Theme context (charts need concrete colours, not CSS variables)
   --------------------------------------------------------------------------- */
export const ThemeCtx = createContext("light");
export function useChartColors() {
  const theme = useContext(ThemeCtx);
  return theme === "dark"
    ? { grid: "#20262E", tick: "#6E7580", accent: "#2BB3A5", accent2: "#E6A83F", danger: "#FF6B5E", tooltipBg: "#13161B", tooltipBorder: "#252B33", ink: "#ECEEF1" }
    : { grid: "#EAEAE5", tick: "#8E918A", accent: "#0C8479", accent2: "#B8790C", danger: "#C0342A", tooltipBg: "#FFFFFF", tooltipBorder: "#E3E3DE", ink: "#14161A" };
}
export function tooltipStyle(c) {
  return { contentStyle: { fontSize: 12, borderRadius: 12, border: `1px solid ${c.tooltipBorder}`, background: c.tooltipBg, color: c.ink, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }, labelStyle: { color: c.ink } };
}

/* ---------------------------------------------------------------------------
   Layout primitives
   --------------------------------------------------------------------------- */
export function Card({ children, className = "", padded = true, style, onClick, lift = false, as: Tag = "div", ...rest }) {
  return (
    <Tag onClick={onClick} className={`${lift ? "oc-lift" : ""} ${className}`} {...rest}
      style={{
        background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18,
        padding: padded ? 20 : 0, boxShadow: "var(--shadow)", position: "relative", ...style,
      }}>
      {children}
    </Tag>
  );
}

export function SectionHeader({ eyebrow, title, description, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
      <div style={{ minWidth: 0 }}>
        {eyebrow && <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{eyebrow}</div>}
        <h1 className="oc-display oc-h1" style={{ fontSize: 30, fontWeight: 700, margin: 0, lineHeight: 1.12 }}>{title}</h1>
        {description && <p style={{ fontSize: 14.5, color: "var(--ink-soft)", marginTop: 8, marginBottom: 0, maxWidth: 680, lineHeight: 1.55 }}>{description}</p>}
      </div>
      {action && <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>{action}</div>}
    </div>
  );
}

export const CardTitle = ({ children, sub, right }) => (
  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: sub ? 12 : 10 }}>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{children}</div>
      {sub && <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginTop: 2, lineHeight: 1.45 }}>{sub}</div>}
    </div>
    {right}
  </div>
);

export function Badge({ tone = "neutral", children, icon: Icon, style }) {
  const tones = {
    neutral: ["var(--surface-sunken)", "var(--ink-soft)"],
    accent: ["var(--accent-soft)", "var(--accent)"],
    success: ["var(--success-soft)", "var(--success)"],
    danger: ["var(--danger-soft)", "var(--danger)"],
    spark: ["var(--spark-soft)", "var(--spark)"],
  };
  const [bg, fg] = tones[tone] || tones.neutral;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: bg, color: fg, fontSize: 12, fontWeight: 650, padding: "3px 9px", borderRadius: 999, lineHeight: 1.5, whiteSpace: "nowrap", ...style }}>
      {Icon && <Icon size={12} className={Icon === Loader2 ? "oc-spin" : ""} />}
      {children}
    </span>
  );
}

export function Skeleton({ w = "100%", h = 14, r = 7, style }) {
  return <div className="oc-skel" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}
export const SkeletonLines = ({ n = 3 }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    {Array.from({ length: n }, (_, i) => <Skeleton key={i} w={`${92 - i * 14}%`} />)}
  </div>
);

/* ---------------------------------------------------------------------------
   Buttons & controls
   --------------------------------------------------------------------------- */
export function Button({ children, onClick, disabled, icon: Icon, variant = "primary", size = "md", type = "button", loading = false, style, title, className = "", ...rest }) {
  const v = {
    primary: { background: "var(--ink)", color: "var(--bg)", border: "1px solid transparent" },
    accent: { background: "var(--accent)", color: "var(--accent-ink)", border: "1px solid transparent" },
    ghost: { background: "var(--surface)", color: "var(--ink)", border: "1px solid var(--border)" },
    subtle: { background: "var(--surface-sunken)", color: "var(--ink)", border: "1px solid transparent" },
    danger: { background: "var(--danger-soft)", color: "var(--danger)", border: "1px solid transparent" },
    link: { background: "transparent", color: "var(--accent)", border: "1px solid transparent" },
  }[variant];
  const pad = size === "sm" ? "7px 11px" : size === "lg" ? "13px 20px" : "10px 15px";
  const fs = size === "sm" ? 13 : size === "lg" ? 15 : 14;
  const off = disabled || loading;
  return (
    <button type={type} onClick={onClick} disabled={off} title={title} className={`oc-press oc-focusable ${className}`} {...rest}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 12,
        padding: pad, fontSize: fs, fontWeight: 650, cursor: off ? "not-allowed" : "pointer", opacity: off ? 0.5 : 1,
        whiteSpace: "nowrap", lineHeight: 1.2, ...v, ...style,
      }}>
      {loading ? <Loader2 size={fs + 1} className="oc-spin" /> : Icon && <Icon size={fs + 1} />}
      {children}
    </button>
  );
}

export function IconButton({ icon: Icon, onClick, title, active, disabled, size = 36, badge, style, tone }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} disabled={disabled} className="oc-press oc-focusable"
      style={{
        width: size, height: size, borderRadius: 11, border: "none", display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: active ? "var(--surface-sunken)" : "transparent", color: tone === "danger" ? "var(--danger)" : "var(--ink-soft)",
        cursor: disabled ? "not-allowed" : "pointer", position: "relative", flexShrink: 0, opacity: disabled ? 0.45 : 1, ...style,
      }}>
      <Icon size={Math.round(size * 0.5)} />
      {badge ? <span style={{ position: "absolute", top: 5, insetInlineEnd: 5, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 99, background: "var(--danger)", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--surface)" }}>{badge > 9 ? "9+" : badge}</span> : null}
    </button>
  );
}

export function Switch({ checked, onChange, disabled, label }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} className="oc-focusable"
      style={{ width: 46, height: 28, borderRadius: 99, border: "none", position: "relative", flexShrink: 0, cursor: disabled ? "not-allowed" : "pointer",
        background: checked ? "var(--success)" : "var(--border-strong)", transition: "background-color .25s var(--ease)", opacity: disabled ? 0.5 : 1 }}>
      <span style={{ position: "absolute", top: 3, insetInlineStart: checked ? 21 : 3, width: 22, height: 22, borderRadius: 99, background: "#fff",
        boxShadow: "0 2px 6px rgba(0,0,0,0.22)", transition: "inset-inline-start .3s var(--ease)" }} />
    </button>
  );
}

export function Segmented({ value, onChange, options, size = "md" }) {
  return (
    <div role="tablist" style={{ display: "inline-flex", background: "var(--surface-sunken)", borderRadius: 12, padding: 3, gap: 2, maxWidth: "100%", overflowX: "auto" }} className="oc-scroll">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} role="tab" aria-selected={active} onClick={() => onChange(o.value)} className="oc-press oc-focusable"
            style={{ border: "none", borderRadius: 10, padding: size === "sm" ? "6px 11px" : "8px 14px", fontSize: size === "sm" ? 12.5 : 13.5, fontWeight: 650, cursor: "pointer", whiteSpace: "nowrap",
              background: active ? "var(--surface)" : "transparent", color: active ? "var(--ink)" : "var(--ink-soft)", boxShadow: active ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
              display: "inline-flex", alignItems: "center", gap: 6 }}>
            {o.icon && <o.icon size={14} />}{o.label}{o.count != null && <span className="oc-mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Field({ label, hint, children, style }) {
  return (
    <label style={{ display: "block", ...style }}>
      {label && <div style={{ fontSize: 12.5, fontWeight: 650, color: "var(--ink-soft)", marginBottom: 6 }}>{label}</div>}
      {children}
      {hint && <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 5, lineHeight: 1.45 }}>{hint}</div>}
    </label>
  );
}

export function ProgressBar({ value, height = 6, tone = "accent" }) {
  const pct = value == null ? null : Math.max(0, Math.min(100, value * 100));
  return (
    <div style={{ height, borderRadius: 99, background: "var(--surface-sunken)", overflow: "hidden", position: "relative" }}>
      {pct == null
        ? <div className="oc-skel" style={{ position: "absolute", inset: 0 }} />
        : <div style={{ height: "100%", width: `${pct}%`, background: `var(--${tone})`, borderRadius: 99, transition: "width .35s var(--ease)" }} />}
    </div>
  );
}

export function EmptyState({ icon: Icon = Info, title, body, action }) {
  return (
    <div style={{ textAlign: "center", padding: "30px 18px", color: "var(--ink-soft)" }}>
      <div style={{ width: 46, height: 46, borderRadius: 14, background: "var(--surface-sunken)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
        <Icon size={20} color="var(--ink-faint)" />
      </div>
      {title && <div style={{ fontWeight: 700, fontSize: 14.5, color: "var(--ink)" }}>{title}</div>}
      {body && <div style={{ fontSize: 13, marginTop: 5, maxWidth: 380, marginInline: "auto", lineHeight: 1.5 }}>{body}</div>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, suffix, onClick, hint }) {
  const n = Number(String(value).replace(/,/g, ""));
  const numeric = value !== "" && value != null && !Number.isNaN(n);
  return (
    <Card lift={Boolean(onClick)} onClick={onClick} style={{ cursor: onClick ? "pointer" : "default", padding: 18 }} className={onClick ? "oc-press" : ""}>
      <div style={{ width: 34, height: 34, borderRadius: 11, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
        <Icon size={17} color="var(--accent)" />
      </div>
      <div className="oc-mono" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>
        {numeric ? <NumberTicker value={n} decimalPlaces={String(value).includes(".") ? 1 : 0} /> : value}
        {suffix && <span style={{ fontSize: 14, color: "var(--ink-faint)", marginInlineStart: 3 }}>{suffix}</span>}
      </div>
      <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 6 }}>{label}</div>
      {hint && <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 3 }}>{hint}</div>}
    </Card>
  );
}

export function Notice({ tone = "neutral", icon: Icon = Info, children, style }) {
  const bg = { neutral: "var(--surface-sunken)", danger: "var(--danger-soft)", spark: "var(--spark-soft)", success: "var(--success-soft)", accent: "var(--accent-soft)" }[tone];
  const fg = { neutral: "var(--ink-soft)", danger: "var(--danger)", spark: "var(--spark)", success: "var(--success)", accent: "var(--accent)" }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} style={{ display: "flex", gap: 9, alignItems: "flex-start", background: bg, color: tone === "neutral" ? "var(--ink-soft)" : "var(--ink)", borderRadius: 12, padding: "10px 12px", fontSize: 13, lineHeight: 1.5, ...style }}>
      <Icon size={15} color={fg} style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ minWidth: 0, flex: 1 }}>{children}</div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Sheet (modal)
   --------------------------------------------------------------------------- */
export function Sheet({ open, onClose, title, children, footer, width = 520, dismissable = true }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape" && dismissable) onClose?.(); };
    document.addEventListener("keydown", onKey);
    const prev = document.activeElement;
    setTimeout(() => ref.current?.querySelector("input,textarea,select,button")?.focus(), 60);
    return () => { document.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [open, onClose, dismissable]);
  if (!open) return null;
  return (
    <div className="oc-sheet-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && dismissable) onClose?.(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined} className="oc-sheet oc-scroll" style={{ maxWidth: width }}>
        <div className="oc-sheet-grabber" />
        {(title || dismissable) && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "16px 18px 4px" }}>
            <div className="oc-display" style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
            {dismissable && <IconButton icon={X} onClick={onClose} title="Close" size={32} />}
          </div>
        )}
        <div style={{ padding: "10px 18px 18px" }}>{children}</div>
        {footer && <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", padding: "0 18px 18px", flexWrap: "wrap" }}>{footer}</div>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Toasts
   --------------------------------------------------------------------------- */
let toasts = [];
const toastSubs = new Set();
const emitToasts = () => toastSubs.forEach((f) => f());
export function toast(message, { tone = "success", ms = 3200 } = {}) {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { id, message, tone }].slice(-3);
  emitToasts();
  setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); emitToasts(); }, ms);
}
export function Toaster() {
  const list = useSyncExternalStore((f) => { toastSubs.add(f); return () => toastSubs.delete(f); }, () => toasts);
  const icons = { success: CheckCircle2, danger: AlertTriangle, info: Info };
  const colors = { success: "var(--success)", danger: "var(--danger)", info: "var(--accent)" };
  return (
    <div className="oc-toasts" aria-live="polite">
      {list.map((t) => {
        const I = icons[t.tone] || Info;
        return (
          <div key={t.id} className="oc-toast">
            <I size={16} color={colors[t.tone]} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ lineHeight: 1.45 }}>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   AI surfaces
   --------------------------------------------------------------------------- */
export function AIInsightPanel({ lang, loading, text, onRegenerate, label, onStop, streaming, footer, actionLabel }) {
  return (
    <Card style={{ background: "linear-gradient(135deg, var(--spark-soft), var(--surface) 70%)", borderColor: "var(--spark-border)", overflow: "hidden" }}>
      {loading && <BorderBeam size={180} duration={5} colorFrom="#E6A83F" colorTo="#B8790C" />}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 11, background: "var(--spark)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sparkles size={17} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <Badge tone="spark" icon={Sparkles}>{label || (lang === "ar" ? "رؤية الذكاء الاصطناعي" : "AI insight")}</Badge>
            {loading && onStop
              ? <Button size="sm" variant="ghost" icon={Square} onClick={onStop}>{lang === "ar" ? "إيقاف" : "Stop"}</Button>
              : onRegenerate && <Button size="sm" variant="ghost" icon={RefreshCw} onClick={onRegenerate}>{actionLabel || (text ? (lang === "ar" ? "إعادة الإنشاء" : "Regenerate") : (lang === "ar" ? "إنشاء" : "Generate"))}</Button>}
          </div>
          <div style={{ marginTop: 10, fontSize: 14.5, lineHeight: 1.6 }}>
            {loading && !text ? <SkeletonLines n={3} /> : text ? <Markdown text={text} streaming={streaming} /> : <span style={{ color: "var(--ink-faint)" }}>{lang === "ar" ? "اضغط «إنشاء» ليكتب النموذج على جهازك رؤية جديدة." : "Press Generate and the on-device model will write one."}</span>}
          </div>
          {footer}
        </div>
      </div>
    </Card>
  );
}

/* Minimal, safe Markdown → React (no HTML injection): paragraphs, headings,
   bullet/numbered lists, **bold**, *italic*, `code`, fenced code, links. */
function inline(text, keyBase) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^)\s]+)\)|\*[^*\s][^*]*\*)/g;
  let last = 0, m, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${keyBase}-${i++}`;
    if (tok.startsWith("**")) out.push(<strong key={k}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) out.push(<code key={k}>{tok.slice(1, -1)}</code>);
    else if (tok.startsWith("[")) {
      const label = tok.slice(1, tok.indexOf("]"));
      out.push(<a key={k} href={m[2]} target="_blank" rel="noopener noreferrer">{label}</a>);
    } else out.push(<em key={k}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text, streaming }) {
  const blocks = [];
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  let i = 0, key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      blocks.push(<pre key={key++}><code>{buf.join("\n")}</code></pre>);
      continue;
    }
    if (/^\s*([-*•]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]/.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*•]|\d+[.)])\s+/, ""));
        i++;
      }
      const L = ordered ? "ol" : "ul";
      blocks.push(<L key={key++}>{items.map((it, j) => <li key={j}>{inline(it, `${key}-${j}`)}</li>)}</L>);
      continue;
    }
    if (/^#{1,6}\s+/.test(line)) {
      blocks.push(<h4 key={key++}>{inline(line.replace(/^#{1,6}\s+/, ""), key)}</h4>);
      i++;
      continue;
    }
    if (!line.trim()) { i++; continue; }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^```|^#{1,6}\s|^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) para.push(lines[i++]);
    blocks.push(<p key={key++}>{para.map((p, j) => <React.Fragment key={j}>{j > 0 && <br />}{inline(p, `${key}-${j}`)}</React.Fragment>)}</p>);
  }
  return <div className={`oc-md ${streaming ? "oc-caret" : ""}`} style={{ overflowWrap: "anywhere" }}>{blocks}</div>;
}

/** Copy-to-clipboard with a transient "Copied" state. */
export function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* clipboard blocked */ }
  };
  return [copied, copy];
}

export function ModuleShell({ children, wide }) {
  return <div className="oc-page" style={{ maxWidth: wide ? 1320 : 1180, marginInline: "auto" }}>{children}</div>;
}
