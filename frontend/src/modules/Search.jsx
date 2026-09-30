import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search as SearchIcon, FileText, MessageSquare, Mic, Bot, Workflow, Scale, Camera, Globe, ExternalLink, Sparkles, Square, ArrowRight, FileSearch } from "lucide-react";
import { Card, SectionHeader, ModuleShell, Button, Badge, Segmented, EmptyState, Markdown, Notice } from "../ui.jsx";
import { useOwned, logEvent, errText, timeAgo } from "../lib/data.js";
import { rank, highlight } from "../lib/search.js";
import { webSearch } from "../lib/web.js";
import { generate, stopGenerating } from "../lib/ai.js";

const TYPES = {
  kb: { icon: FileText, en: "Knowledge", ar: "المعرفة", route: "chat" },
  chat: { icon: MessageSquare, en: "Chats", ar: "المحادثات", route: "chat" },
  document: { icon: FileSearch, en: "Analyses", ar: "التحليلات", route: "documents" },
  meeting: { icon: Mic, en: "Meetings", ar: "الاجتماعات", route: "speech" },
  agent: { icon: Bot, en: "Agent runs", ar: "تشغيلات الوكلاء", route: "agents" },
  vision: { icon: Camera, en: "Images", ar: "الصور", route: "vision" },
  trade: { icon: Scale, en: "Regulatory", ar: "تنظيمي", route: "trade" },
  automation: { icon: Workflow, en: "Automations", ar: "الأتمتة", route: "automation" },
  web: { icon: Globe, en: "Web", ar: "الويب" },
};

const T = {
  en: { eyebrow: "Module 08", title: "Enterprise Search", desc: "One search across everything in your workspace — knowledge documents, every chat, meeting notes, analyses, agent runs and automations — ranked instantly on your device.",
    ph: "Search your workspace…", all: "All", web: "Include Wikipedia", webNote: "When on, only your search words are sent to Wikipedia. Your documents and chats never leave this device.",
    results: "results", none: "No matches. Try other words, or add content in Chat or Document Intelligence.", start: "Start typing to search everything you've created.",
    ask: "Answer from these results", open: "Open", indexed: "items indexed", err: "Error: " },
  ar: { eyebrow: "الوحدة 08", title: "البحث المؤسسي", desc: "بحث واحد في كل ما في مساحة عملك — مستندات المعرفة وكل المحادثات وملاحظات الاجتماعات والتحليلات وتشغيلات الوكلاء والأتمتة — مرتَّب فورًا على جهازك.",
    ph: "ابحث في مساحة عملك…", all: "الكل", web: "تضمين ويكيبيديا", webNote: "عند التفعيل تُرسَل كلمات البحث فقط إلى ويكيبيديا. مستنداتك ومحادثاتك لا تغادر جهازك.",
    results: "نتيجة", none: "لا تطابقات. جرّب كلمات أخرى، أو أضف محتوى في الدردشة أو ذكاء المستندات.", start: "ابدأ الكتابة للبحث في كل ما أنشأته.",
    ask: "أجب من هذه النتائج", open: "فتح", indexed: "عنصرًا مفهرسًا", err: "خطأ: " },
};

function Highlighted({ text, q }) {
  return <>{highlight(text, q).map((p, i) => p.hit ? <mark key={i} style={{ background: "var(--spark-soft)", color: "inherit", borderRadius: 3, padding: "0 1px" }}>{p.text}</mark> : <React.Fragment key={i}>{p.text}</React.Fragment>)}</>;
}

export default function Search({ lang, user, go }) {
  const t = T[lang];
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [filter, setFilter] = useState("all");
  const [useWeb, setUseWeb] = useState(false);
  const [web, setWeb] = useState([]);
  const [webErr, setWebErr] = useState(null);
  const [answer, setAnswer] = useState("");
  const [answering, setAnswering] = useState(false);
  const inputRef = useRef(null);
  const logged = useRef("");

  const [docs] = useOwned("docs", user.username);
  const [threads] = useOwned("threads", user.username);
  const [records] = useOwned("records", user.username);
  const [autos] = useOwned("automations", user.username);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { const h = setTimeout(() => setDq(q.trim()), 140); return () => clearTimeout(h); }, [q]);

  const corpus = useMemo(() => {
    const out = [];
    for (const d of docs) out.push({ id: `kb:${d.id}`, type: "kb", title: d.title, body: d.content, at: d.updatedAt });
    for (const th of threads) th.messages.forEach((m, i) => out.push({ id: `chat:${th.id}:${i}`, type: "chat", title: `${th.title || "Chat"} · ${m.role === "user" ? (lang === "ar" ? "أنت" : "You") : (lang === "ar" ? "المساعد" : "Assistant")}`, body: m.content, at: m.at || th.updatedAt, threadId: th.id }));
    for (const r of records) {
      if (r.kind === "document") out.push({ id: r.id, type: "document", title: r.name, body: `${r.summary}\n${(r.points || []).join("\n")}`, at: r.at });
      else if (r.kind === "meeting") out.push({ id: r.id, type: "meeting", title: `${lang === "ar" ? "اجتماع" : "Meeting"} ${new Date(r.at).toLocaleDateString()}`, body: `${r.summary}\n${(r.actions || []).join("\n")}\n${r.transcript || ""}`, at: r.at });
      else if (r.kind === "agent") out.push({ id: r.id, type: "agent", title: `${r.agent} · ${(r.input || "").slice(0, 60)}`, body: `${r.input}\n${r.output}`, at: r.at });
      else if (r.kind === "vision") out.push({ id: r.id, type: "vision", title: r.mode === "describe" ? (r.scene || "").slice(0, 70) : (r.question || r.mode), body: [r.scene, (r.objects || []).join(", "), r.text, r.raw].filter(Boolean).join("\n"), at: r.at });
      else if (r.kind === "trade") out.push({ id: r.id, type: "trade", title: r.question, body: `${r.answer || ""}\n${(r.citations || []).map((c) => c.title).join("\n")}`, at: r.at });
    }
    for (const a of autos) out.push({ id: a.id, type: "automation", title: a.name, body: `${a.trigger} ${a.action} ${a.message || ""}`, at: a.updatedAt });
    return out;
  }, [docs, threads, records, autos, lang]);

  const hits = useMemo(() => (dq.length >= 2 ? rank(dq, corpus, 60) : []), [dq, corpus]);

  useEffect(() => {
    if (!useWeb || dq.length < 3) { setWeb([]); setWebErr(null); return; }
    let cancelled = false;
    const h = setTimeout(async () => {
      try { const r = await webSearch(dq, lang); if (!cancelled) { setWeb(r); setWebErr(null); } }
      catch (e) { if (!cancelled) setWebErr(errText(e, lang)); }
    }, 450);
    return () => { cancelled = true; clearTimeout(h); };
  }, [useWeb, dq, lang]);

  useEffect(() => {
    if (dq.length < 3 || dq === logged.current) return;
    const h = setTimeout(() => { logged.current = dq; logEvent(user.username, "search", "search.performed", dq); }, 1500);
    return () => clearTimeout(h);
  }, [dq, user.username]);
  useEffect(() => setAnswer(""), [dq]);

  const all = [...hits, ...web.map((w, i) => ({ ...w, id: `web:${i}`, type: "web", body: w.snippet }))];
  const counts = all.reduce((m, h) => ((m[h.type] = (m[h.type] || 0) + 1), m), {});
  const shown = filter === "all" ? all : all.filter((h) => h.type === filter);

  const openHit = (h) => {
    if (h.type === "web") { window.open(h.url, "_blank", "noopener"); return; }
    if (h.type === "chat") { window.location.hash = `/chat/${h.threadId}`; return; }
    go(TYPES[h.type].route);
  };

  const ask = async () => {
    setAnswering(true); setAnswer("");
    const top = shown.slice(0, 6);
    const ctx = top.map((h, i) => `[${i + 1}] ${h.title}\n${(h.snippet || h.body || "").slice(0, 700)}`).join("\n\n");
    try {
      await generate({
        system: lang === "ar" ? "أجب عن السؤال من النتائج المرقّمة فقط واستشهد بها [1]. إن لم تكفِ فقل ذلك." : "Answer the query only from the numbered results and cite them like [1]. If they don't cover it, say so.",
        prompt: `QUERY: ${dq}\n\nRESULTS:\n${ctx}`, maxTokens: 380, temperature: 0.3, onToken: (tok) => setAnswer((a) => a + tok),
      });
    } catch (e) { setAnswer(t.err + errText(e, lang)); }
    finally { setAnswering(false); }
  };

  return (
    <ModuleShell>
      <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc} action={<Badge>{corpus.length.toLocaleString()} {t.indexed}</Badge>} />
      <div style={{ position: "relative" }}>
        <SearchIcon size={18} color="var(--ink-faint)" style={{ position: "absolute", insetInlineStart: 16, top: "50%", transform: "translateY(-50%)" }} />
        <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.ph} className="oc-input" aria-label={t.ph}
          style={{ padding: "15px 16px", paddingInlineStart: 46, fontSize: 16.5, borderRadius: 16, background: "var(--surface)" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 650, color: "var(--ink-soft)", cursor: "pointer" }}>
          <input type="checkbox" checked={useWeb} onChange={(e) => setUseWeb(e.target.checked)} style={{ accentColor: "var(--accent)", width: 16, height: 16 }} />
          <Globe size={14} /> {t.web}
        </label>
        <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>{t.webNote}</span>
      </div>
      {webErr && <Notice tone="danger" style={{ marginTop: 10 }}>{webErr}</Notice>}

      {dq.length >= 2 && (
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "space-between" }}>
          <Segmented size="sm" value={filter} onChange={setFilter} options={[
            { value: "all", label: t.all, count: all.length },
            ...Object.keys(TYPES).filter((k) => counts[k]).map((k) => ({ value: k, label: TYPES[k][lang], icon: TYPES[k].icon, count: counts[k] })),
          ]} />
          {shown.length > 0 && (answering
            ? <Button size="sm" variant="ghost" icon={Square} onClick={stopGenerating}>{lang === "ar" ? "إيقاف" : "Stop"}</Button>
            : <Button size="sm" variant="accent" icon={Sparkles} onClick={ask}>{t.ask}</Button>)}
        </div>
      )}
      {answer && (
        <Card className="oc-fade-up" style={{ marginTop: 12, background: "linear-gradient(135deg, var(--spark-soft), var(--surface) 70%)", borderColor: "var(--spark-border)" }}>
          <div style={{ fontSize: 14.5, lineHeight: 1.6 }}><Markdown text={answer} streaming={answering} /></div>
        </Card>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
        {dq.length < 2 && <EmptyState icon={SearchIcon} body={t.start} />}
        {dq.length >= 2 && shown.length === 0 && <EmptyState icon={SearchIcon} body={t.none} />}
        {shown.map((h, i) => {
          const ty = TYPES[h.type];
          return (
            <Card key={h.id} padded={false} className="oc-fade-up oc-press" style={{ animationDelay: `${Math.min(i, 10) * 18}ms`, cursor: "pointer" }} onClick={() => openHit(h)} role="button" tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && openHit(h)}>
              <div style={{ display: "flex", gap: 12, padding: 14, alignItems: "flex-start" }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: h.type === "web" ? "var(--surface-sunken)" : "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <ty.icon size={16} color={h.type === "web" ? "var(--ink-soft)" : "var(--accent)"} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 650, fontSize: 14 }}><Highlighted text={h.title} q={dq} /></span>
                    <Badge tone={h.type === "web" ? "neutral" : "accent"}>{ty[lang]}</Badge>
                    {h.at && <span style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{timeAgo(h.at, lang)}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4, lineHeight: 1.5 }}><Highlighted text={h.snippet || ""} q={dq} /></div>
                  {h.url && <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5, fontSize: 12, color: "var(--accent)" }}><ExternalLink size={11} />{h.url.replace(/^https?:\/\//, "").slice(0, 70)}</div>}
                </div>
                <ArrowRight size={16} color="var(--ink-faint)" className="oc-flip" style={{ flexShrink: 0, marginTop: 8 }} />
              </div>
            </Card>
          );
        })}
      </div>
    </ModuleShell>
  );
}
