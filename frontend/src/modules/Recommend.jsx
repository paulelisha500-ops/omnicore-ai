import React, { useMemo, useState } from "react";
import { Compass, BookOpen, Workflow, Users2, ArrowRight, Plus, CheckCircle2, FileText, AlertTriangle } from "lucide-react";
import { Card, SectionHeader, ModuleShell, Button, Badge, Segmented, EmptyState, AIInsightPanel, toast } from "../ui.jsx";
import { useOwned, useRecords, errText } from "../lib/data.js";
import { createRule, refreshSchedules } from "../lib/automation.js";
import { rank } from "../lib/search.js";
import { generate, stopGenerating } from "../lib/ai.js";
import { NAV_ITEMS } from "../i18n.js";

const T = {
  en: {
    eyebrow: "Module 07", title: "Recommendation Engine",
    desc: "Personalised from your real activity in this workspace — what to do next, which of your documents matter now, automations worth switching on, and which customers need attention.",
    tabs: { next: "Next steps", docs: "Related knowledge", autos: "Automations", risk: "At-risk customers" },
    open: "Open", add: "Turn on", added: "Automation created",
    noDocs: "Add documents to your knowledge base and chat a little — related documents will surface here.",
    noRisk: "Score a customer file in Predictive Analytics and the riskiest customers appear here.", scoreNow: "Score customers",
    allAutos: "You've already set up every suggested automation.", allNext: "You've explored every module recently — nice.",
    because: "Why", from: "From", aiLabel: "Picked for you",
  },
  ar: {
    eyebrow: "الوحدة 07", title: "محرك التوصيات",
    desc: "مخصص من نشاطك الحقيقي في مساحة العمل هذه — ما الخطوة التالية، وأي مستنداتك مهمة الآن، والأتمتة التي تستحق التفعيل، والعملاء الذين يحتاجون الاهتمام.",
    tabs: { next: "الخطوات التالية", docs: "معرفة ذات صلة", autos: "الأتمتة", risk: "العملاء المعرّضون" },
    open: "فتح", add: "تفعيل", added: "تم إنشاء الأتمتة",
    noDocs: "أضف مستندات إلى قاعدة المعرفة وتحدث قليلًا — ستظهر المستندات ذات الصلة هنا.",
    noRisk: "قيّم ملف عملاء في التحليلات التنبؤية وسيظهر العملاء الأكثر خطورة هنا.", scoreNow: "قيّم العملاء",
    allAutos: "لقد أعددت كل الأتمتة المقترحة بالفعل.", allNext: "لقد استكشفت كل الوحدات مؤخرًا — رائع.",
    because: "السبب", from: "من", aiLabel: "مختار لك",
  },
};

const NEXT = {
  documents: { en: "Analyze a contract or report to get a summary and key points.", ar: "حلّل عقدًا أو تقريرًا للحصول على ملخص ونقاط رئيسية." },
  vision: { en: "Read the text off a receipt, label or whiteboard photo.", ar: "اقرأ النص من صورة إيصال أو ملصق أو سبورة." },
  speech: { en: "Record your next meeting and get decisions and action items.", ar: "سجّل اجتماعك القادم واحصل على القرارات وبنود العمل." },
  agents: { en: "Ask the Reporting Agent for a weekly report of this workspace.", ar: "اطلب من وكيل التقارير تقريرًا أسبوعيًا لمساحة العمل." },
  analytics: { en: "Score a customer list to find who's likely to churn.", ar: "قيّم قائمة عملاء لمعرفة من يُرجَّح تسرّبه." },
  search: { en: "Search across every chat, document and analysis at once.", ar: "ابحث في كل المحادثات والمستندات والتحليلات دفعة واحدة." },
  trade: { en: "Look up official import rules for a market you sell into.", ar: "ابحث عن قواعد الاستيراد الرسمية لسوق تبيع فيه." },
  automation: { en: "Automate a notification when something important happens.", ar: "أتمت إشعارًا عند حدوث أمر مهم." },
  plugins: { en: "Connect Slack, Discord or a webhook to send results out.", ar: "اربط Slack أو Discord أو Webhook لإرسال النتائج." },
  chat: { en: "Ask the assistant a question grounded in your documents.", ar: "اسأل المساعد سؤالًا مستندًا إلى مستنداتك." },
};
const MODULE_EVENT = { documents: "documents", vision: "vision", speech: "speech", agents: "agents", analytics: "analytics", search: "search", trade: "trade", automation: "automation", plugins: "integrations", chat: "chat" };

const AUTO_SUGGESTIONS = [
  { trigger: "prediction.high_risk", needs: "analytics", en: "Alert me when a customer is predicted high-risk", ar: "نبّهني عند توقع عميل عالي الخطورة" },
  { trigger: "batch.scored", needs: "analytics", en: "Notify me when a customer file finishes scoring", ar: "أشعرني عند اكتمال تقييم ملف عملاء" },
  { trigger: "document.analyzed", needs: "documents", en: "Keep a log of every analyzed document", ar: "احتفظ بسجل لكل مستند محلَّل", action: "kb.save" },
  { trigger: "transcript.summarized", needs: "speech", en: "Notify me when meeting notes are ready", ar: "أشعرني عندما تجهز ملاحظات الاجتماع" },
  { trigger: "trade.searched", needs: "trade", en: "Save regulatory searches to the knowledge base", ar: "احفظ البحوث التنظيمية في قاعدة المعرفة", action: "kb.save" },
  { trigger: "agent.completed", needs: "agents", en: "Notify me when an agent finishes", ar: "أشعرني عند انتهاء وكيل" },
];

export default function Recommend({ lang, user, go }) {
  const t = T[lang];
  const [tab, setTab] = useState("next");
  const [events] = useOwned("events", user.username, { sort: (a, b) => b.at - a.at });
  const [docs] = useOwned("docs", user.username);
  const [threads] = useOwned("threads", user.username);
  const [autos] = useOwned("automations", user.username);
  const [batches] = useRecords(user.username, "batch");
  const [ai, setAi] = useState("");
  const [busy, setBusy] = useState(false);

  const recentModules = useMemo(() => new Set(events.filter((e) => e.at > Date.now() - 30 * 86400_000).map((e) => e.module)), [events]);
  const next = NAV_ITEMS.filter((n) => NEXT[n.key] && !recentModules.has(MODULE_EVENT[n.key]));

  const related = useMemo(() => {
    const context = [
      ...threads.slice(0, 5).flatMap((th) => th.messages.filter((m) => m.role === "user").slice(-3).map((m) => m.content)),
      ...events.filter((e) => ["search", "trade", "documents"].includes(e.module)).slice(0, 10).map((e) => e.detail),
    ].join(" ");
    if (!context.trim() || !docs.length) return [];
    return rank(context, docs.map((d) => ({ id: d.id, type: "kb", title: d.title, body: d.content })), 8);
  }, [threads, events, docs]);

  const existing = new Set(autos.map((a) => a.trigger));
  const autoSugs = AUTO_SUGGESTIONS.filter((s) => !existing.has(s.trigger))
    .sort((a, b) => Number(recentModules.has(b.needs)) - Number(recentModules.has(a.needs)));
  const latestBatch = batches[0];

  const addAuto = async (s) => {
    await createRule(user.username, { name: s[lang], trigger: s.trigger, action: s.action || "notify" });
    refreshSchedules(); toast(t.added);
  };

  const generateAi = async () => {
    setBusy(true); setAi("");
    const ctx = [
      `Modules used in the last 30 days: ${[...recentModules].join(", ") || "none"}`,
      `Modules not yet used: ${next.map((n) => n.en).join(", ") || "none"}`,
      `Knowledge documents: ${docs.slice(0, 8).map((d) => d.title).join("; ") || "none"}`,
      `Recent chat questions: ${threads.slice(0, 4).map((th) => th.title).join("; ") || "none"}`,
      `Automations: ${autos.map((a) => a.name).join("; ") || "none"}`,
      latestBatch ? `Latest customer scoring: ${latestBatch.highRisk} high-risk of ${latestBatch.rows}` : "No customers scored yet",
    ].join("\n");
    try {
      await generate({
        system: lang === "ar"
          ? "أنت محرك توصيات أومنيكور. بناءً على النشاط الحقيقي المعطى فقط، اقترح 3 توصيات عملية مرقمة، لكل منها سبب من سطر مرتبط مباشرة بالنشاط. لا تخترع بيانات."
          : "You are OmniCore's recommendation engine. Based only on the real activity given, suggest 3 numbered, practical recommendations, each with a one-line reason tied directly to that activity. Never invent data.",
        prompt: ctx, maxTokens: 320, temperature: 0.6, onToken: (tok) => setAi((s) => s + tok),
      });
    } catch (e) { setAi(errText(e, lang)); }
    finally { setBusy(false); }
  };

  const Row = ({ icon: I, title, body, action, tone }) => (
    <Card style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 16 }}>
      <div style={{ width: 36, height: 36, borderRadius: 11, background: tone === "danger" ? "var(--danger-soft)" : "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <I size={17} color={tone === "danger" ? "var(--danger)" : "var(--accent)"} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14.5 }}>{title}</div>
        <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 3, lineHeight: 1.5 }}>{body}</div>
      </div>
      {action}
    </Card>
  );

  return (
    <ModuleShell>
      <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc} />
      <AIInsightPanel lang={lang} label={t.aiLabel} loading={busy} streaming={busy} text={ai} onRegenerate={generateAi} onStop={stopGenerating} />
      <div style={{ margin: "16px 0 12px" }}>
        <Segmented value={tab} onChange={setTab} options={[
          { value: "next", label: t.tabs.next, icon: Compass, count: next.length },
          { value: "docs", label: t.tabs.docs, icon: BookOpen, count: related.length },
          { value: "autos", label: t.tabs.autos, icon: Workflow, count: autoSugs.length },
          { value: "risk", label: t.tabs.risk, icon: Users2, count: latestBatch?.top?.length || 0 },
        ]} />
      </div>
      <div className="oc-fade-up" key={tab} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
        {tab === "next" && (next.length === 0 ? <EmptyState icon={CheckCircle2} body={t.allNext} /> : next.map((n) => (
          <Row key={n.key} icon={n.icon} title={n[lang]} body={NEXT[n.key][lang]} action={<Button size="sm" variant="ghost" icon={ArrowRight} onClick={() => go(n.key)}>{t.open}</Button>} />
        )))}
        {tab === "docs" && (related.length === 0 ? <EmptyState icon={BookOpen} body={t.noDocs} /> : related.map((d) => (
          <Row key={d.id} icon={FileText} title={d.title} body={d.snippet} action={<Badge tone="accent">{d.score.toFixed(1)}</Badge>} />
        )))}
        {tab === "autos" && (autoSugs.length === 0 ? <EmptyState icon={CheckCircle2} body={t.allAutos} /> : autoSugs.map((s) => (
          <Row key={s.trigger} icon={Workflow} title={s[lang]}
            body={recentModules.has(s.needs) ? (lang === "ar" ? "لأنك استخدمت هذه الوحدة مؤخرًا." : "Because you've used this module recently.") : (lang === "ar" ? "جاهزة عندما تبدأ استخدام هذه الوحدة." : "Ready for when you start using this module.")}
            action={<Button size="sm" variant="accent" icon={Plus} onClick={() => addAuto(s)}>{t.add}</Button>} />
        )))}
        {tab === "risk" && (!latestBatch ? <EmptyState icon={Users2} body={t.noRisk} action={<Button size="sm" onClick={() => go("analytics")}>{t.scoreNow}</Button>} /> : latestBatch.top.map((r, i) => (
          <Row key={i} icon={AlertTriangle} tone="danger" title={r.id || `#${i + 1}`}
            body={`${(r.p * 100).toFixed(1)}% · ${r.contract || ""}${r.tenure !== undefined ? ` · ${r.tenure} mo` : ""} · ${t.from} ${latestBatch.name}`}
            action={<Badge tone="danger">{(r.p * 100).toFixed(0)}%</Badge>} />
        )))}
      </div>
    </ModuleShell>
  );
}
