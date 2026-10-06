import React, { useMemo, useRef, useState } from "react";
import { Bot, Play, Square, Copy, Check, BookMarked, CheckCircle2, Upload, FileSpreadsheet, X, Search, ClipboardList, Code2, BarChart3, Headphones, Wallet, Users, FileBarChart, Trash2 } from "lucide-react";
import { Card, SectionHeader, ModuleShell, Button, Badge, Markdown, Notice, Sheet, SkeletonLines, EmptyState, useCopy, toast } from "../ui.jsx";
import { addDoc, addRecord, deleteRecord, useRecords, logEvent, errText, timeAgo } from "../lib/data.js";
import { db } from "../lib/db.js";
import { generate, stopGenerating } from "../lib/ai.js";
import { webSearch, sourceBlock } from "../lib/web.js";
import { parseCSV } from "../lib/churn.js";
import { commonText } from "../i18n.js";

const AGENTS = [
  { key: "research", icon: Search, en: "Research Agent", ar: "وكيل البحث", enD: "Pulls live sources, then writes a cited brief", arD: "يجلب مصادر حية ثم يكتب موجزًا موثقًا",
    ph: { en: "e.g. Key risks of adopting AI in a regulated industry", ar: "مثال: أهم مخاطر تبنّي الذكاء الاصطناعي في قطاع منظّم" },
    sys: { en: "You are a Research Agent. Using the numbered SOURCES where relevant (cite as [1], [2]), write a structured brief: a one-line heading, 3-5 key findings as bullets, and a one-line takeaway. Be concrete. If sources are thin, say what's missing.",
      ar: "أنت وكيل بحث. استخدم المصادر المرقّمة عند الصلة (استشهد بها [1]، [2])، واكتب موجزًا منظمًا: عنوانًا من سطر، و3-5 نتائج رئيسية كنقاط، وخلاصة من سطر. كن محددًا، وإن كانت المصادر محدودة فاذكر ما ينقص." } },
  { key: "planning", icon: ClipboardList, en: "Planning Agent", ar: "وكيل التخطيط", enD: "Turns an objective into an ordered plan", arD: "يحوّل الهدف إلى خطة مرتبة",
    ph: { en: "e.g. Launch a customer loyalty program in Q1", ar: "مثال: إطلاق برنامج ولاء للعملاء في الربع الأول" },
    sys: { en: "You are a Planning Agent. Break the objective into a numbered plan of 5-8 steps, each with an owner role and a one-clause reason it matters. Finish with the single biggest risk and how to mitigate it.",
      ar: "أنت وكيل تخطيط. قسّم الهدف إلى خطة مرقّمة من 5-8 خطوات، لكل خطوة دور مسؤول وسبب موجز لأهميتها. اختم بأكبر خطر وطريقة الحد منه." } },
  { key: "coding", icon: Code2, en: "Coding Assistant", ar: "مساعد البرمجة", enD: "Writes and explains clean code", arD: "يكتب كودًا نظيفًا ويشرحه",
    ph: { en: "e.g. A Python function that validates an email address", ar: "مثال: دالة Python للتحقق من صحة بريد إلكتروني" },
    sys: { en: "You are a Coding Assistant. Reply with a fenced code block of clean, correct code with brief comments, then 1-3 sentences explaining it. Default to Python if no language is implied.",
      ar: "أنت مساعد برمجة. أجب بكتلة كود محاطة بعلامات ``` تحتوي كودًا نظيفًا وصحيحًا مع تعليقات موجزة، ثم اشرحه في 1-3 جمل. افترض Python إن لم تُحدَّد لغة." } },
  { key: "data", icon: BarChart3, en: "Data Analyst Agent", ar: "وكيل تحليل البيانات", enD: "Profiles a CSV you attach and plans the analysis", arD: "يحلل ملف CSV ترفقه ويخطط للتحليل",
    ph: { en: "Describe your question, and attach a CSV for a real data profile", ar: "صف سؤالك وأرفق ملف CSV لتحليل حقيقي" },
    sys: { en: "You are a Data Analyst Agent. If a DATA PROFILE is provided, ground every statement in it (quote the actual numbers) — never invent values. Give: 3 notable observations, 3 specific analyses to run next (with the metric each answers), and data-quality issues to fix.",
      ar: "أنت وكيل تحليل بيانات. إن وُجد «ملف تعريف البيانات» فاستند إليه في كل عبارة (اذكر الأرقام الفعلية) ولا تخترع قيمًا. قدّم: 3 ملاحظات بارزة، و3 تحليلات محددة تالية (مع المقياس لكل منها)، ومشكلات جودة البيانات." } },
  { key: "support", icon: Headphones, en: "Customer Support Agent", ar: "وكيل دعم العملاء", enD: "Drafts empathetic replies to tickets", arD: "يصيغ ردودًا متعاطفة على التذاكر",
    ph: { en: "Paste a customer message or complaint…", ar: "الصق رسالة أو شكوى عميل…" },
    sys: { en: "You are a Customer Support Agent. Draft a professional, empathetic reply: acknowledge the specific issue, give a clear next step and timeline, under 130 words. Then add a one-line internal note with the ticket category and priority.",
      ar: "أنت وكيل دعم عملاء. صِغ ردًا مهنيًا متعاطفًا: اعترف بالمشكلة تحديدًا، وحدّد خطوة تالية واضحة وإطارًا زمنيًا، بأقل من 130 كلمة. ثم أضف ملاحظة داخلية من سطر بفئة التذكرة وأولويتها." } },
  { key: "finance", icon: Wallet, en: "Finance Agent", ar: "وكيل الشؤون المالية", enD: "Explains spend anomalies and next questions", arD: "يفسر الشذوذ في الإنفاق والأسئلة التالية",
    ph: { en: "e.g. Marketing spend jumped from $12k to $47k this month", ar: "مثال: ارتفع إنفاق التسويق من 12 ألف إلى 47 ألف دولار هذا الشهر" },
    sys: { en: "You are a Finance Agent that reviews spend anomalies. List the most likely explanations ranked by probability, the first question to ask the budget owner, the documents to request, and whether it warrants an audit flag (yes/no with reason).",
      ar: "أنت وكيل مالي يراجع الشذوذ في الإنفاق. اذكر أرجح التفسيرات مرتبة، وأول سؤال لمالك الميزانية، والمستندات المطلوبة، وهل يستدعي علامة تدقيق (نعم/لا مع السبب)." } },
  { key: "hr", icon: Users, en: "HR Agent", ar: "وكيل الموارد البشرية", enD: "Best-practice policy guidance and letters", arD: "إرشادات السياسات وصياغة الخطابات",
    ph: { en: "e.g. Draft a fair approach to remote-work requests", ar: "مثال: صِغ نهجًا عادلًا لطلبات العمل عن بُعد" },
    sys: { en: "You are an HR Agent. Give practical best-practice guidance or draft the requested letter. Note clearly that specific cases need review against the actual company policy and local employment law — never state law as fact.",
      ar: "أنت وكيل موارد بشرية. قدّم إرشادًا عمليًا لأفضل الممارسات أو صِغ الخطاب المطلوب. نوّه بوضوح إلى أن الحالات المحددة تحتاج مراجعة وفق سياسة الشركة وقانون العمل المحلي — ولا تذكر القانون كحقيقة." } },
  { key: "reporting", icon: FileBarChart, en: "Reporting Agent", ar: "وكيل التقارير", enD: "Writes a weekly report from your real workspace data", arD: "يكتب تقريرًا أسبوعيًا من بيانات مساحة عملك الحقيقية",
    ph: { en: "Optional focus, e.g. automation adoption", ar: "تركيز اختياري، مثل: اعتماد الأتمتة" },
    sys: { en: "You are a Reporting Agent. Write a weekly executive report grounded ONLY in the WORKSPACE DATA given: a 3-4 sentence summary quoting the real numbers, 3 highlights as bullets, and one recommendation. Never invent figures.",
      ar: "أنت وكيل تقارير. اكتب تقريرًا تنفيذيًا أسبوعيًا مستندًا فقط إلى «بيانات مساحة العمل» المعطاة: ملخص من 3-4 جمل بالأرقام الحقيقية، و3 نقاط بارزة، وتوصية واحدة. لا تخترع أرقامًا." } },
];

const T = {
  en: { eyebrow: "Module 05", title: "AI Agent Platform", desc: "Eight specialised agents. Research pulls live sources, the Data Analyst profiles your real CSV, and Reporting reads your actual workspace.",
    runs: "runs", never: "Not run yet", last: "Last run", run: "Run agent", running: "Working", attach: "Attach CSV", profile: "Data profile ready", save: "Save to knowledge base", saved: "Saved",
    history: "Previous runs", noRuns: "No runs yet.", gathering: "Gathering sources", err: "Error: " },
  ar: { eyebrow: "الوحدة 05", title: "منصة الوكلاء الأذكياء", desc: "ثمانية وكلاء متخصصين. وكيل البحث يجلب مصادر حية، ومحلل البيانات يدرس ملف CSV الحقيقي، ووكيل التقارير يقرأ مساحة عملك الفعلية.",
    runs: "تشغيلات", never: "لم يُشغَّل بعد", last: "آخر تشغيل", run: "تشغيل الوكيل", running: "جارٍ العمل", attach: "إرفاق CSV", profile: "ملف تعريف البيانات جاهز", save: "حفظ في قاعدة المعرفة", saved: "تم الحفظ",
    history: "التشغيلات السابقة", noRuns: "لا تشغيلات بعد.", gathering: "جارٍ جمع المصادر", err: "خطأ: " },
};

/* Real column-level profile of a CSV: types, missing values, stats, top values. */
function profileCSV(text, name) {
  const { header, records } = parseCSV(text);
  const rows = records.slice(0, 50000);
  const cols = header.slice(0, 40).map((h) => {
    const vals = rows.map((r) => r[h]);
    const present = vals.filter((v) => v !== "" && v != null);
    const nums = present.map((v) => Number(String(v).replace(/,/g, ""))).filter((n) => Number.isFinite(n));
    const missing = vals.length - present.length;
    if (present.length && nums.length / present.length >= 0.9) {
      const sorted = [...nums].sort((a, b) => a - b);
      const mean = nums.reduce((s, n) => s + n, 0) / nums.length;
      return `- ${h} (numeric): n=${nums.length}, missing=${missing}, mean=${mean.toFixed(2)}, median=${sorted[Math.floor(sorted.length / 2)]}, min=${sorted[0]}, max=${sorted[sorted.length - 1]}`;
    }
    const counts = new Map();
    for (const v of present) counts.set(v, (counts.get(v) || 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([v, n]) => `${String(v).slice(0, 30)} (${n})`).join(", ");
    return `- ${h} (text): unique=${counts.size}, missing=${missing}, top: ${top}`;
  });
  return { summary: `DATA PROFILE of "${name}": ${rows.length} rows × ${header.length} columns${records.length > rows.length ? ` (first ${rows.length} profiled)` : ""}\n${cols.join("\n")}`, rows: rows.length, cols: header.length };
}

async function workspaceData(owner) {
  const [docs, threads, events, autos, records] = await Promise.all(["docs", "threads", "events", "automations", "records"].map((s) => db.byOwner(s, owner)));
  const week = events.filter((e) => e.at > Date.now() - 7 * 86400_000);
  const byModule = {};
  for (const e of week) byModule[e.module] = (byModule[e.module] || 0) + 1;
  const kinds = {};
  for (const r of records) kinds[r.kind] = (kinds[r.kind] || 0) + 1;
  const batches = records.filter((r) => r.kind === "batch");
  return [
    `Knowledge documents: ${docs.length}`,
    `Chat threads: ${threads.length}, total messages: ${threads.reduce((n, t) => n + t.messages.length, 0)}`,
    `Actions in the last 7 days: ${week.length}; by module: ${Object.entries(byModule).map(([k, v]) => `${k} ${v}`).join(", ") || "none"}`,
    `Automations: ${autos.length} (${autos.filter((a) => a.enabled).length} active), total runs: ${autos.reduce((n, a) => n + (a.runs || 0), 0)}`,
    `Documents analyzed: ${kinds.document || 0}; images analyzed: ${kinds.vision || 0}; meetings summarized: ${kinds.meeting || 0}; agent runs: ${kinds.agent || 0}`,
    `Churn predictions saved: ${kinds.prediction || 0}; customer files scored: ${batches.length} (${batches.reduce((n, b) => n + (b.rows || 0), 0)} customers, ${batches.reduce((n, b) => n + (b.highRisk || 0), 0)} high-risk)`,
  ].join("\n");
}

export default function Agents({ lang, user }) {
  const t = T[lang];
  const [runs] = useRecords(user.username, "agent");
  const [open, setOpen] = useState(null);
  const stats = useMemo(() => {
    const m = {};
    for (const r of runs) { m[r.agent] ??= { n: 0, last: 0 }; m[r.agent].n++; m[r.agent].last = Math.max(m[r.agent].last, r.at); }
    return m;
  }, [runs]);

  return (
    <ModuleShell>
      <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 12 }}>
        {AGENTS.map((a) => {
          const s = stats[a.key];
          return (
            <Card key={a.key} lift onClick={() => setOpen(a)} className="oc-press" style={{ cursor: "pointer" }} role="button" tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen(a)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <a.icon size={18} color="var(--accent)" />
                </div>
                <Badge tone={s ? "success" : "neutral"}>{s ? `${s.n} ${t.runs}` : t.never}</Badge>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginTop: 12 }}>{a[lang]}</div>
              <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4, lineHeight: 1.5 }}>{lang === "ar" ? a.arD : a.enD}</div>
              {s && <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 10 }}>{t.last} {timeAgo(s.last, lang)}</div>}
            </Card>
          );
        })}
      </div>
      {open && <AgentSheet agent={open} lang={lang} t={t} user={user} runs={runs.filter((r) => r.agent === open.key)} onClose={() => setOpen(null)} />}
    </ModuleShell>
  );
}

function AgentSheet({ agent, lang, t, user, runs, onClose }) {
  const [input, setInput] = useState("");
  const [csv, setCsv] = useState(null);
  const [phase, setPhase] = useState(null);
  const [out, setOut] = useState("");
  const [sources, setSources] = useState([]);
  const [err, setErr] = useState(null);
  const [saved, setSaved] = useState(false);
  const [copied, copy] = useCopy();
  const fileRef = useRef(null);
  const busy = phase !== null;
  const needsInput = !["reporting"].includes(agent.key) && !(agent.key === "data" && csv);

  const attach = async (f) => {
    if (!f) return;
    try { setCsv({ name: f.name, ...profileCSV(await f.text(), f.name) }); } catch (e) { setErr(errText(e, lang)); }
  };

  const run = async () => {
    setErr(null); setOut(""); setSources([]); setSaved(false);
    let context = "";
    let srcs = [];
    try {
      if (agent.key === "research") {
        setPhase("gather");
        const web = await webSearch(input, lang).catch(() => []);
        srcs = web;
        setSources(web);
        context = web.length ? `SOURCES:\n${sourceBlock(web)}\n\n` : "SOURCES: none could be retrieved — rely on general knowledge and say so.\n\n";
      }
      if (agent.key === "reporting") context = `WORKSPACE DATA (real, from this workspace):\n${await workspaceData(user.username)}\n\n`;
      if (agent.key === "data" && csv) context = `${csv.summary}\n\n`;
      setPhase("run");
      const prompt = `${context}${agent.key === "reporting" ? (input ? `FOCUS: ${input}` : "Write this week's report.") : `TASK: ${input || (lang === "ar" ? "حلّل هذه البيانات." : "Analyze this dataset.")}`}`;
      const text = await generate({ system: agent.sys[lang], prompt, maxTokens: agent.key === "coding" ? 900 : 650, temperature: agent.key === "coding" ? 0.3 : 0.6, onToken: (tok) => setOut((o) => o + tok) });
      setOut(text);
      await addRecord(user.username, "agent", { agent: agent.key, input: input.slice(0, 500), output: text, sources: agent.key === "research" ? srcs : undefined, csv: csv?.name });
      await logEvent(user.username, "agents", "agent.completed", `${agent.en}: ${(input || csv?.name || "report").slice(0, 80)}`);
    } catch (e) { setErr(t.err + errText(e, lang)); }
    finally { setPhase(null); }
  };

  const save = async () => {
    await addDoc(user.username, { title: `${agent[lang]} — ${(input || csv?.name || new Date().toLocaleDateString()).slice(0, 60)}`, content: out, source: "agents" });
    setSaved(true); toast(t.saved);
  };

  return (
    <Sheet open onClose={onClose} title={agent[lang]} width={760}>
      <div style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 10 }}>{lang === "ar" ? agent.arD : agent.enD}</div>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder={agent.ph[lang]} rows={3} className="oc-input"
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(); }} />
      {agent.key === "data" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {csv
            ? <Badge tone="success" icon={FileSpreadsheet}>{csv.name} · {csv.rows.toLocaleString()} × {csv.cols}</Badge>
            : <Button size="sm" variant="ghost" icon={Upload} onClick={() => fileRef.current?.click()}>{t.attach}</Button>}
          {csv && <button onClick={() => setCsv(null)} aria-label={commonText[lang].remove} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ink-faint)" }}><X size={14} /></button>}
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { attach(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {busy
          ? <Button variant="ghost" icon={Square} onClick={stopGenerating}>{lang === "ar" ? "إيقاف" : "Stop"}</Button>
          : <Button variant="accent" icon={Play} onClick={run} disabled={needsInput && !input.trim()}>{t.run}</Button>}
      </div>
      {err && <Notice tone="danger" style={{ marginTop: 12 }}>{err}</Notice>}
      {(busy || out) && (
        <div style={{ marginTop: 16, background: "var(--surface-sunken)", borderRadius: 14, padding: 14 }}>
          {phase === "gather" && <div style={{ fontSize: 13, color: "var(--ink-faint)", marginBottom: 8 }}>{t.gathering}…</div>}
          {busy && !out ? <SkeletonLines n={4} /> : <div style={{ fontSize: 14, lineHeight: 1.6 }}><Markdown text={out} streaming={busy} /></div>}
          {sources.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              {sources.map((s, i) => <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}><Badge tone="accent">[{i + 1}] {s.title.slice(0, 40)}</Badge></a>)}
            </div>
          )}
          {!busy && out && (
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <Button size="sm" variant="ghost" icon={copied ? Check : Copy} onClick={() => copy(out)}>{copied ? "Copied" : "Copy"}</Button>
              <Button size="sm" variant="ghost" icon={saved ? CheckCircle2 : BookMarked} onClick={save} disabled={saved}>{saved ? t.saved : t.save}</Button>
            </div>
          )}
        </div>
      )}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{t.history}</div>
        {runs.length === 0 ? <div style={{ fontSize: 13, color: "var(--ink-faint)" }}>{t.noRuns}</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {runs.slice(0, 8).map((r) => (
              <details key={r.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "9px 12px", background: "var(--surface-2)" }}>
                <summary style={{ cursor: "pointer", fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>{r.input || r.csv || (lang === "ar" ? "تقرير" : "Report")}</span>
                  <span style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{timeAgo(r.at, lang)}</span>
                  <button onClick={(e) => { e.preventDefault(); deleteRecord(r.id); }} aria-label={commonText[lang].delete} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ink-faint)" }}><Trash2 size={13} /></button>
                </summary>
                <div style={{ fontSize: 13.5, lineHeight: 1.6, marginTop: 8 }}><Markdown text={r.output} /></div>
              </details>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
