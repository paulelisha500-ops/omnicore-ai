import React, { useState } from "react";
import { Search, Sparkles, ExternalLink, BadgeCheck, Landmark, CheckCircle2, Globe2, Square, BookMarked, History, Trash2, AlertTriangle } from "lucide-react";
import { Card, CardTitle, SectionHeader, ModuleShell, Button, Badge, Notice, EmptyState, SkeletonLines, AIInsightPanel, toast } from "../ui.jsx";
import { addDoc, addRecord, deleteRecord, useRecords, logEvent, errText, timeAgo } from "../lib/data.js";
import { JURISDICTIONS, SECTORS, research, SYSTEM_EN, SYSTEM_AR } from "../lib/trade.js";
import { sourceBlock } from "../lib/web.js";
import { generate, stopGenerating } from "../lib/ai.js";
import { commonText } from "../i18n.js";

const T = {
  en: {
    eyebrow: "Module 13", title: "Trade & Regulatory Intelligence",
    desc: "Ask a cross-border trade or business-law question. OmniCore retrieves live from official government sources, ranks official results first and cites everything — it never writes law from memory.",
    ph: "e.g. What are the import requirements for cosmetics?", juris: "Jurisdictions", sector: "Sector", find: "Find sources", finding: "Retrieving",
    sources: "Retrieved sources", official: "Official", unofficial: "Unofficial · orientation only", summarize: "Summarize with AI", aiLabel: "Cited AI summary",
    siteSearch: "Search each authority's own site", siteSub: "Opens a search limited to that government domain",
    directory: "Official directory", directorySub: "Hand-verified entry pages — always available",
    none: "No live sources came back for this question. Use the authority searches and directory below.", empty: "Ask a question to retrieve official sources.",
    failed: "Couldn't reach", disclaimer: "Retrieval summary, not legal advice. Regulations change — verify with the primary source before acting.",
    live: "Live official API", pick: "Select at least one jurisdiction.", save: "Save to knowledge base", saved: "Saved", history: "Recent research", noHistory: "Your research history appears here.",
  },
  ar: {
    eyebrow: "الوحدة 13", title: "التجارة والذكاء التنظيمي",
    desc: "اطرح سؤالًا عن التجارة عبر الحدود أو قانون الأعمال. يسترجع أومنيكور مباشرة من مصادر حكومية رسمية ويقدّم الرسمي أولًا ويوثّق كل شيء — ولا يكتب القانون من الذاكرة.",
    ph: "مثال: ما متطلبات استيراد مستحضرات التجميل؟", juris: "الولايات القضائية", sector: "القطاع", find: "ابحث عن المصادر", finding: "جارٍ الاسترجاع",
    sources: "المصادر المسترجعة", official: "رسمي", unofficial: "غير رسمي · للتوجيه فقط", summarize: "لخّص بالذكاء الاصطناعي", aiLabel: "ملخص موثّق بالذكاء الاصطناعي",
    siteSearch: "ابحث في موقع كل جهة رسمية", siteSub: "يفتح بحثًا مقصورًا على نطاق تلك الجهة الحكومية",
    directory: "الدليل الرسمي", directorySub: "صفحات دخول موثّقة يدويًا — متاحة دائمًا",
    none: "لم تُسترجع مصادر حية لهذا السؤال. استخدم بحث الجهات والدليل أدناه.", empty: "اطرح سؤالًا لاسترجاع المصادر الرسمية.",
    failed: "تعذّر الوصول إلى", disclaimer: "ملخص استرجاعي وليس استشارة قانونية. الأنظمة تتغيّر — تحقّق من المصدر الأساسي قبل التصرّف.",
    live: "واجهة رسمية مباشرة", pick: "اختر ولاية قضائية واحدة على الأقل.", save: "حفظ في قاعدة المعرفة", saved: "تم الحفظ", history: "البحوث الأخيرة", noHistory: "يظهر سجل بحوثك هنا.",
  },
};

export default function Trade({ lang, user }) {
  const t = T[lang];
  const [question, setQuestion] = useState("");
  const [picked, setPicked] = useState(["uae", "usa"]);
  const [sector, setSector] = useState("general");
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [err, setErr] = useState(null);
  const [saved, setSaved] = useState(false);
  const [history] = useRecords(user.username, "trade");

  const toggle = (k) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  const find = async () => {
    if (question.trim().length < 3) return;
    if (!picked.length) { setErr(t.pick); return; }
    setLoading(true); setErr(null); setRes(null); setSummary(""); setSaved(false);
    try {
      const r = await research(question, picked, sector, lang);
      setRes(r);
      await addRecord(user.username, "trade", { question, picked, sector, citations: r.citations.map(({ n, title, url, official, source }) => ({ n, title, url, official, source })) });
      await logEvent(user.username, "trade", "trade.searched", question.slice(0, 120));
    } catch (e) { setErr(errText(e, lang)); }
    finally { setLoading(false); }
  };

  const summarize = async () => {
    if (!res?.citations.length) return;
    setSummarizing(true); setSummary("");
    try {
      const block = sourceBlock(res.citations);
      await generate({ system: lang === "ar" ? SYSTEM_AR : SYSTEM_EN, prompt: `QUESTION: ${question}\n\nSOURCES:\n${block}`, maxTokens: 420, temperature: 0.2, onToken: (tok) => setSummary((s) => s + tok) });
    } catch (e) { setSummary(errText(e, lang)); }
    finally { setSummarizing(false); }
  };

  const save = async () => {
    const body = [`Question: ${question}`, summary ? `Summary:\n${summary}` : "", `Sources:\n${res.citations.map((c) => `[${c.n}] ${c.title} — ${c.url}${c.official ? " (official)" : ""}`).join("\n")}`].filter(Boolean).join("\n\n");
    await addDoc(user.username, { title: `Regulatory: ${question.slice(0, 70)}`, content: body, source: "trade" });
    setSaved(true); toast(t.saved);
  };

  const chip = (active) => ({
    display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", borderRadius: 999, padding: "7px 13px", fontSize: 13, fontWeight: 650,
    background: active ? "var(--accent)" : "var(--surface)", color: active ? "var(--accent-ink)" : "var(--ink-soft)", border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
  });

  return (
    <ModuleShell>
      <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc} />
      <Card>
        <textarea value={question} onChange={(e) => setQuestion(e.target.value.slice(0, 500))} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); find(); } }}
          placeholder={t.ph} rows={2} className="oc-input" aria-label={t.title} />
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-soft)", margin: "14px 0 8px" }}>{t.juris}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {JURISDICTIONS.map((j) => (
            <button key={j.key} onClick={() => toggle(j.key)} className="oc-press oc-focusable" style={chip(picked.includes(j.key))} aria-pressed={picked.includes(j.key)}>
              {picked.includes(j.key) && <CheckCircle2 size={13} />}{j[lang]}{j.live && <span title={t.live} style={{ width: 6, height: 6, borderRadius: 99, background: picked.includes(j.key) ? "#fff" : "var(--success)" }} />}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-soft)", margin: "14px 0 8px" }}>{t.sector}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {SECTORS.map((s) => <button key={s.key} onClick={() => setSector(s.key)} className="oc-press oc-focusable" style={chip(sector === s.key)}>{s[lang]}</button>)}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
          <Button variant="accent" icon={Search} onClick={find} loading={loading} disabled={question.trim().length < 3}>{loading ? t.finding : t.find}</Button>
          {res?.citations.length > 0 && (summarizing
            ? <Button variant="ghost" icon={Square} onClick={stopGenerating}>{lang === "ar" ? "إيقاف" : "Stop"}</Button>
            : <Button variant="ghost" icon={Sparkles} onClick={summarize}>{t.summarize}</Button>)}
          {res && <Button variant="ghost" icon={saved ? CheckCircle2 : BookMarked} onClick={save} disabled={saved}>{saved ? t.saved : t.save}</Button>}
          <span style={{ fontSize: 12, color: "var(--ink-faint)", marginInlineStart: "auto" }} className="oc-mono">{question.length}/500</span>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--success)" }} /> {t.live}: Federal Register (US) · GOV.UK · EU Open Data Portal
        </div>
        {err && <Notice tone="danger" style={{ marginTop: 12 }}>{err}</Notice>}
      </Card>

      {(summarizing || summary) && <div style={{ marginTop: 14 }}><AIInsightPanel lang={lang} label={t.aiLabel} loading={summarizing} streaming={summarizing} text={summary} onRegenerate={summarize} onStop={stopGenerating} /></div>}

      {loading && <Card style={{ marginTop: 14 }}><SkeletonLines n={5} /></Card>}
      {!res && !loading && <Card style={{ marginTop: 14 }}><EmptyState icon={Globe2} body={t.empty} /></Card>}
      {res && (
        <div className="oc-fade-up" style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
          {res.failures.length > 0 && <Notice tone="spark" icon={AlertTriangle}>{t.failed}: {res.failures.join(", ")}</Notice>}
          <Card>
            <CardTitle right={res.citations.length > 0 && <Badge tone="success" icon={BadgeCheck}>{res.officialCount}/{res.citations.length} {t.official}</Badge>}>{t.sources}</CardTitle>
            {res.citations.length === 0 ? <div style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>{t.none}</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {res.citations.map((c) => (
                  <a key={c.url} href={c.url} target="_blank" rel="noopener noreferrer" className="oc-press oc-focusable" style={{
                    display: "block", textDecoration: "none", color: "inherit", borderRadius: 14, padding: "12px 14px",
                    border: `1px solid ${c.official ? "var(--accent)" : "var(--border)"}`, background: c.official ? "var(--accent-soft)" : "var(--surface-2)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                      <span className="oc-mono" style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-faint)" }}>[{c.n}]</span>
                      <Badge tone={c.official ? "success" : "neutral"} icon={c.official ? BadgeCheck : undefined}>{c.official ? t.official : t.unofficial}</Badge>
                      <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>{c.source} · {lang === "ar" ? c.jurisdiction_ar : c.jurisdiction}{c.date ? ` · ${c.date}` : ""}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 650, lineHeight: 1.4 }}>{c.title}</div>
                    {c.snippet && <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 4, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.snippet}</div>}
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, fontSize: 12, color: "var(--accent)" }}><ExternalLink size={11} />{c.url.replace(/^https?:\/\//, "").slice(0, 80)}</div>
                  </a>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <CardTitle sub={t.siteSub}>{t.siteSearch}</CardTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 8 }}>
              {res.siteLinks.map((s) => (
                <a key={s.domain} href={s.url} target="_blank" rel="noopener noreferrer" className="oc-press oc-focusable oc-row-hover" style={{ textDecoration: "none", color: "inherit", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px", display: "flex", gap: 10, alignItems: "center" }}>
                  <Search size={15} color="var(--accent)" style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 650 }}>{s.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{s.domain} · {lang === "ar" ? s.jurisdiction_ar : s.jurisdiction}</div>
                  </div>
                </a>
              ))}
            </div>
          </Card>
          {res.directory.length > 0 && (
            <Card>
              <CardTitle sub={t.directorySub} right={<Landmark size={16} color="var(--accent)" />}>{t.directory}</CardTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 9 }}>
                {res.directory.map((d) => (
                  <a key={d.url} href={d.url} target="_blank" rel="noopener noreferrer" className="oc-press oc-focusable oc-row-hover" style={{ textDecoration: "none", color: "inherit", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{d.name}</div>
                    <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 2 }}>{d.body}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 4, lineHeight: 1.45 }}>{d.note}</div>
                  </a>
                ))}
              </div>
            </Card>
          )}
          <div style={{ fontSize: 12, color: "var(--ink-faint)", lineHeight: 1.6 }}>{t.disclaimer} · {res.searched.join(", ")}</div>
        </div>
      )}

      <Card style={{ marginTop: 14 }}>
        <CardTitle>{t.history}</CardTitle>
        {history.length === 0 ? <EmptyState icon={History} body={t.noHistory} /> : (
          <div>
            {history.slice(0, 10).map((h) => (
              <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                <button onClick={() => { setQuestion(h.question); setPicked(h.picked); setSector(h.sector); }} className="oc-focusable"
                  style={{ flex: 1, minWidth: 0, textAlign: "start", border: "none", background: "none", cursor: "pointer", fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--ink)" }}>{h.question}</button>
                <Badge>{h.citations?.length || 0}</Badge>
                <span style={{ fontSize: 11.5, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>{timeAgo(h.at, lang)}</span>
                <button onClick={() => deleteRecord(h.id)} aria-label={commonText[lang].delete} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ink-faint)" }}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </ModuleShell>
  );
}
