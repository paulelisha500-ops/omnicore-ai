import React, { useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { FileText, MessageSquare, ImageIcon, TrendingUp, Workflow, Users2, CircleDot, ArrowUpRight, Upload, Sparkles, Search, Activity } from "lucide-react";
import { Card, CardTitle, SectionHeader, StatCard, AIInsightPanel, ModuleShell, Button, EmptyState, useChartColors, tooltipStyle } from "../ui.jsx";
import { useOwned, useRecords, dailyTrend, timeAgo, errText } from "../lib/data.js";
import { generate, stopGenerating } from "../lib/ai.js";
import { METRICS, IMPORTANCE } from "../lib/churn.js";
import { NAV_ITEMS } from "../i18n.js";

const T = {
  en: {
    eyebrow: "Home", title: "Executive Dashboard", desc: "Your workspace at a glance — every number below is computed from what you've actually done in OmniCore.",
    kpi: { docs: "Knowledge documents", chats: "Chat messages", images: "Images analyzed", auc: "Churn model ROC-AUC", autos: "Active automations", scored: "Customers scored" },
    trend: "Activity — last 14 days", trendSub: "Daily count of logged actions", usage: "Where time goes", usageSub: "Actions per module, last 14 days",
    drivers: "Top churn drivers", driversSub: "Feature importance from the trained model",
    recent: "Recent activity", noActivity: "Nothing yet. Start with a chat or a document — everything you do shows up here.",
    quick: "Quick actions", ask: "Ask the assistant", analyze: "Analyze a document", score: "Score customers", find: "Search everything",
    insightErr: "Couldn't generate an insight: ",
  },
  ar: {
    eyebrow: "الرئيسية", title: "لوحة القيادة التنفيذية", desc: "نظرة سريعة على مساحة عملك — كل رقم أدناه محسوب مما قمت به فعليًا في أومنيكور.",
    kpi: { docs: "مستندات المعرفة", chats: "رسائل الدردشة", images: "الصور المحلَّلة", auc: "دقة نموذج التسرّب (ROC-AUC)", autos: "الأتمتة النشطة", scored: "العملاء المُقيَّمون" },
    trend: "النشاط — آخر 14 يومًا", trendSub: "عدد الإجراءات المسجلة يوميًا", usage: "أين يذهب الوقت", usageSub: "الإجراءات لكل وحدة خلال 14 يومًا",
    drivers: "أهم مسببات التسرّب", driversSub: "أهمية الخصائص من النموذج المُدرَّب",
    recent: "النشاط الأخير", noActivity: "لا شيء بعد. ابدأ بمحادثة أو مستند — سيظهر كل ما تفعله هنا.",
    quick: "إجراءات سريعة", ask: "اسأل المساعد", analyze: "حلّل مستندًا", score: "قيّم العملاء", find: "ابحث في كل شيء",
    insightErr: "تعذّر إنشاء الرؤية: ",
  },
};

const MODULE_NAMES = {
  chat: ["Chat", "الدردشة"], documents: ["Documents", "المستندات"], vision: ["Vision", "الرؤية"], speech: ["Speech", "الصوت"],
  agents: ["Agents", "الوكلاء"], analytics: ["Predictive", "التنبؤ"], search: ["Search", "البحث"], trade: ["Trade", "التجارة"],
  automation: ["Automation", "الأتمتة"], integrations: ["Integrations", "التكاملات"], knowledge: ["Knowledge", "المعرفة"], auth: ["Sign-in", "الدخول"],
  recommend: ["Recommendations", "التوصيات"], settings: ["Settings", "الإعدادات"], security: ["Security", "الأمان"],
};

export default function Dashboard({ lang, user, go }) {
  const t = T[lang];
  const c = useChartColors();
  const [docs] = useOwned("docs", user.username);
  const [threads] = useOwned("threads", user.username);
  const [events] = useOwned("events", user.username, { sort: (a, b) => b.at - a.at });
  const [autos] = useOwned("automations", user.username);
  const [vision] = useRecords(user.username, "vision");
  const [batches] = useRecords(user.username, "batch");
  const [insight, setInsight] = useState("");
  const [busy, setBusy] = useState(false);

  const chatCount = threads.reduce((n, th) => n + (th.messages?.length || 0), 0);
  const scored = batches.reduce((n, b) => n + (b.rows || 0), 0);
  const trend = useMemo(() => dailyTrend(events, 14), [events]);
  const usage = useMemo(() => {
    const since = Date.now() - 14 * 86400_000;
    const m = new Map();
    for (const e of events) if (e.at >= since && e.module !== "auth") m.set(e.module, (m.get(e.module) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [events]);
  const maxUsage = Math.max(1, ...usage.map(([, n]) => n));

  const kpis = [
    { icon: FileText, label: t.kpi.docs, value: docs.length, to: "chat" },
    { icon: MessageSquare, label: t.kpi.chats, value: chatCount, to: "chat" },
    { icon: ImageIcon, label: t.kpi.images, value: vision.length, to: "vision" },
    { icon: TrendingUp, label: t.kpi.auc, value: (METRICS.roc_auc * 100).toFixed(1), suffix: "%", to: "analytics" },
    { icon: Workflow, label: t.kpi.autos, value: autos.filter((a) => a.enabled).length, to: "automation" },
    { icon: Users2, label: t.kpi.scored, value: scored, to: "analytics" },
  ];

  const generateInsight = async () => {
    setBusy(true); setInsight("");
    const lastWeek = events.filter((e) => e.at > Date.now() - 7 * 86400_000);
    const stats = [
      `Knowledge documents: ${docs.length}`, `Chat messages: ${chatCount}`, `Images analyzed: ${vision.length}`,
      `Active automations: ${autos.filter((a) => a.enabled).length} of ${autos.length}`, `Customers scored for churn: ${scored}`,
      `Actions in the last 7 days: ${lastWeek.length}`, `Most-used modules (14d): ${usage.map(([m, n]) => `${m} ${n}`).join(", ") || "none yet"}`,
      `Churn model ROC-AUC 84.5%; top driver: month-to-month contracts`,
    ].join("\n");
    try {
      await generate({
        system: lang === "ar"
          ? "أنت الطبقة التنفيذية لأومنيكور. اكتب رؤية تنفيذية موجزة (2-3 جمل) بالعربية بناءً على الأرقام المعطاة فقط، ثم اقتراحًا عمليًا واحدًا. لا تخترع أرقامًا."
          : "You are OmniCore's executive layer. Write a concise 2-3 sentence executive insight about this workspace using ONLY the numbers listed — do not calculate, estimate or invent any other figures. If most counts are zero, say the workspace is just getting started and suggest the first thing to try. End with one practical next step. No headings.",
        prompt: `WORKSPACE NUMBERS:
${stats}`, maxTokens: 200, temperature: 0.3, onToken: (tok) => setInsight((s) => s + tok),
      });
    } catch (e) {
      setInsight(t.insightErr + errText(e, lang));
    } finally { setBusy(false); }
  };

  const navName = (m) => (MODULE_NAMES[m] ? MODULE_NAMES[m][lang === "ar" ? 1 : 0] : m);

  return (
    <ModuleShell>
      <SectionHeader eyebrow={t.eyebrow} title={`${lang === "ar" ? "أهلًا" : "Hi"}, ${user.full_name.split(" ")[0]}`} description={t.desc} />
      <AIInsightPanel lang={lang} loading={busy} streaming={busy} text={insight} onRegenerate={generateInsight} onStop={stopGenerating} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(146px, 1fr))", gap: 12, margin: "16px 0" }}>
        {kpis.map((k) => <StatCard key={k.label} icon={k.icon} label={k.label} value={String(k.value)} suffix={k.suffix} onClick={() => go(k.to)} />)}
      </div>

      <div className="oc-dash-grid" style={{ display: "grid", gridTemplateColumns: "1.45fr 1fr", gap: 14 }}>
        <Card>
          <CardTitle sub={t.trendSub}>{t.trend}</CardTitle>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={trend} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="ocArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c.accent} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={c.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: c.tick }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: c.tick }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle(c)} formatter={(v) => [v, lang === "ar" ? "إجراءات" : "actions"]} />
              <Area type="monotone" dataKey="v" stroke={c.accent} strokeWidth={2.2} fill="url(#ocArea)" animationDuration={700} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardTitle sub={t.usageSub}>{t.usage}</CardTitle>
          {usage.length === 0
            ? <EmptyState icon={Activity} body={t.noActivity} />
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {usage.map(([m, n]) => (
                  <div key={m}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                      <span style={{ color: "var(--ink-soft)", textTransform: "capitalize" }}>{navName(m)}</span>
                      <span className="oc-mono" style={{ fontWeight: 650 }}>{n}</span>
                    </div>
                    <div style={{ height: 7, borderRadius: 5, background: "var(--surface-sunken)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 5, background: "var(--accent)", width: `${(n / maxUsage) * 100}%`, transition: "width .6s var(--ease)" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
        </Card>
      </div>

      <div className="oc-dash-grid" style={{ display: "grid", gridTemplateColumns: "1.45fr 1fr", gap: 14, marginTop: 14 }}>
        <Card>
          <CardTitle right={events.length > 0 && <Button size="sm" variant="ghost" onClick={() => go("profile")}>{lang === "ar" ? "الكل" : "See all"}</Button>}>{t.recent}</CardTitle>
          {events.length === 0 ? <EmptyState icon={CircleDot} body={t.noActivity} /> : (
            <div>
              {events.slice(0, 7).map((e) => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                  <CircleDot size={12} color="var(--accent)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <strong style={{ fontWeight: 650 }}>{navName(e.module)}</strong> · {e.detail || e.action}
                  </span>
                  <span style={{ fontSize: 11.5, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>{timeAgo(e.at, lang)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card>
            <CardTitle sub={t.driversSub}>{t.drivers}</CardTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {IMPORTANCE.slice(0, 5).map((f) => (
                <div key={f.feature}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: "var(--ink-soft)" }}>{lang === "ar" ? f.ar : f.feature}</span>
                    <span className="oc-mono" style={{ fontWeight: 650 }}>{(f.importance * 100).toFixed(1)}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 4, background: "var(--surface-sunken)" }}>
                    <div style={{ height: "100%", borderRadius: 4, background: "var(--accent)", width: `${Math.min(100, f.importance * 450)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardTitle>{t.quick}</CardTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Button variant="subtle" icon={Sparkles} onClick={() => go("chat")}>{t.ask}</Button>
              <Button variant="subtle" icon={Upload} onClick={() => go("documents")}>{t.analyze}</Button>
              <Button variant="subtle" icon={TrendingUp} onClick={() => go("analytics")}>{t.score}</Button>
              <Button variant="subtle" icon={Search} onClick={() => go("search")}>{t.find}</Button>
            </div>
          </Card>
        </div>
      </div>
    </ModuleShell>
  );
}
