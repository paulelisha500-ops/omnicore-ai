import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Send, Plus, Trash2, BookOpen, Globe, ImagePlus, X, Square, RefreshCw, Copy, Check, MessageSquare, Upload,
  FileText, Sparkles, PanelRight, ExternalLink, Loader2, History,
} from "lucide-react";
import { Card, Button, IconButton, Badge, Markdown, EmptyState, Sheet, Notice, Segmented, toast, useCopy } from "../ui.jsx";
import { useOwned, createThread, saveThread, deleteThread, addDoc, removeDoc, logEvent, errText, timeAgo } from "../lib/data.js";
import { generate, stopGenerating, useAI } from "../lib/ai.js";
import { rank } from "../lib/search.js";
import { chunkText, readFile, downscale, ACCEPT } from "../lib/docs.js";
import { webSearch, sourceBlock } from "../lib/web.js";

const T = {
  en: {
    newChat: "New chat", chats: "Chats", knowledge: "Knowledge", placeholder: "Message OmniCore…",
    useKb: "Knowledge", useWeb: "Web", attach: "Attach image", noThreads: "No conversations yet.",
    kbTitle: "Knowledge base", kbDesc: "The assistant cites these when they're relevant to your question.",
    kbPaste: "Paste a policy, FAQ, or notes…", kbAdd: "Add text", kbUpload: "Upload file", kbEmpty: "No documents yet. Add text or upload a PDF, Word or text file.",
    hello: "How can I help?", helloSub: "Answers start streaming instantly. Turn on Knowledge to ground answers in your documents, or Web to pull in Wikipedia.",
    thinking: "Thinking", searching: "Searching", sources: "Sources", regenerate: "Regenerate", deleteChat: "Delete chat",
    stop: "Stop", err: "Something went wrong: ", readFail: "Couldn't read that file: ", added: "Added to knowledge base",
    confirmDelete: "Delete this conversation?", chars: "chars",
    suggestions: [
      "Summarize what's in my knowledge base",
      "Draft a polite reply to a customer whose delivery is late",
      "What is the corporate tax rate in the UAE?",
      "Explain customer churn to a new sales manager",
    ],
  },
  ar: {
    newChat: "محادثة جديدة", chats: "المحادثات", knowledge: "المعرفة", placeholder: "اكتب رسالة إلى أومنيكور…",
    useKb: "المعرفة", useWeb: "الويب", attach: "إرفاق صورة", noThreads: "لا محادثات بعد.",
    kbTitle: "قاعدة المعرفة", kbDesc: "يستشهد بها المساعد عندما تكون ذات صلة بسؤالك.",
    kbPaste: "الصق سياسة أو أسئلة شائعة أو ملاحظات…", kbAdd: "إضافة نص", kbUpload: "رفع ملف", kbEmpty: "لا مستندات بعد. أضف نصًا أو ارفع ملف PDF أو Word أو نص.",
    hello: "كيف يمكنني المساعدة؟", helloSub: "تبدأ الإجابات بالظهور فورًا. فعّل «المعرفة» لإسناد الإجابات إلى مستنداتك، أو «الويب» لجلب ويكيبيديا.",
    thinking: "يفكّر", searching: "يبحث", sources: "المصادر", regenerate: "إعادة الإنشاء", deleteChat: "حذف المحادثة",
    stop: "إيقاف", err: "حدث خطأ: ", readFail: "تعذّرت قراءة الملف: ", added: "أُضيف إلى قاعدة المعرفة",
    confirmDelete: "حذف هذه المحادثة؟", chars: "حرف",
    suggestions: [
      "لخّص محتوى قاعدة معرفتي",
      "اكتب ردًا مهذبًا لعميل تأخر طلبه",
      "ما نسبة ضريبة الشركات في الإمارات؟",
      "اشرح تسرّب العملاء لمدير مبيعات جديد",
    ],
  },
};

const threadFromHash = () => window.location.hash.split("/")[2] || null;

async function thumb(blob) {
  const small = await downscale(blob, 360);
  return new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(small); });
}

export default function Chat({ lang, user }) {
  const t = T[lang];
  const ai = useAI();
  const [threads] = useOwned("threads", user.username);
  const [docs] = useOwned("docs", user.username);
  const [activeId, setActiveId] = useState(threadFromHash);
  const [input, setInput] = useState("");
  const [useKb, setUseKb] = useState(true);
  const [useWeb, setUseWeb] = useState(false);
  const [attachments, setAttachments] = useState([]); // { blob, url }
  const [phase, setPhase] = useState(null); // null | searching | thinking
  const [draft, setDraft] = useState("");
  const [panel, setPanel] = useState("chats");
  const [sheet, setSheet] = useState(null); // mobile: chats | knowledge
  const [confirmDel, setConfirmDel] = useState(null);
  const scrollRef = useRef(null);
  const taRef = useRef(null);
  const fileRef = useRef(null);
  const busy = phase !== null;

  const active = threads.find((th) => th.id === activeId) || null;
  const messages = active?.messages || [];

  useEffect(() => {
    const onHash = () => { const id = threadFromHash(); if (id) setActiveId(id); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: busy ? "auto" : "smooth" });
  }, [messages.length, draft, busy]);
  useEffect(() => { // autosize composer
    const ta = taRef.current; if (!ta) return;
    if (!input) { ta.style.height = ""; return; }
    ta.style.height = "auto"; ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
  }, [input]);

  const openThread = (id) => { setActiveId(id); setSheet(null); history.replaceState(null, "", `#/chat/${id}`); };
  const newChat = () => { setActiveId(null); setDraft(""); setSheet(null); history.replaceState(null, "", "#/chat"); setTimeout(() => taRef.current?.focus(), 50); };

  const addImages = async (files) => {
    const imgs = [...files].filter((f) => f.type.startsWith("image/")).slice(0, 3);
    const next = await Promise.all(imgs.map(async (f) => ({ blob: await downscale(f, 1280), url: await thumb(f) })));
    setAttachments((a) => [...a, ...next].slice(0, 3));
  };

  const run = async (baseThread, userText, images, opts = {}) => {
    const withWeb = opts.web ?? useWeb;
    setDraft("");
    let thread = baseThread;
    const query = userText.trim();
    const sources = [];
    let context = "";
    try {
      if (useKb && docs.length && query) {
        const chunks = docs.flatMap((d) => chunkText(d.content, 1400).map((body, i) => ({ id: `${d.id}:${i}`, type: "kb", title: d.title, body })));
        const hits = rank(query, chunks, 4);
        if (hits.length) {
          context += `KNOWLEDGE BASE EXCERPTS:\n${hits.map((h, i) => `[K${i + 1}] ${h.title}\n${h.body}`).join("\n\n")}\n\n`;
          hits.forEach((h, i) => sources.push({ label: `K${i + 1}`, title: h.title, kind: "kb" }));
        }
      }
      if (withWeb && query) {
        setPhase("searching");
        const web = await webSearch(query, lang).catch(() => []);
        if (web.length) {
          context += `WEB RESULTS (Wikipedia):\n${sourceBlock(web.slice(0, 3)).replace(/^\[(\d+)\]/gm, "[W$1]")}\n\n`;
          web.slice(0, 3).forEach((w, i) => sources.push({ label: `W${i + 1}`, title: w.title, url: w.url, kind: "web" }));
        }
      }
      setPhase("thinking");
      const system = lang === "ar"
        ? "أنت مساعد أومنيكور للمؤسسات. أجب بالعربية بدقة وإيجاز وبتنسيق Markdown بسيط عند الحاجة. لا تخترع أرقامًا أو حقائق."
        : "You are OmniCore's enterprise assistant. Be accurate, concise and practical. Use simple Markdown (short lists, bold) when it helps. Never invent figures or facts.";
      const history = thread.messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      // Small models follow sources best when they sit right next to the
      // question, so excerpts go into this turn only (not the saved thread).
      if (context && history.length) {
        const instr = lang === "ar"
          ? "أجب عن السؤال باستخدام المقتطفات أعلاه. إن ذكرت رقمًا فانقله كما ورد واستشهد بوسمه مثل [W1] أو [K1]. إن لم تجب المقتطفات عن السؤال فقل ذلك صراحة."
          : "Answer the question using the excerpts above. If you state a figure, copy it exactly as written and cite its tag, like [W1] or [K1]. If the excerpts don't answer the question, say so plainly.";
        history[history.length - 1] = { role: "user", content: `${context}${instr}\n\nQUESTION: ${query}` };
      }
      let text = await generate({
        system, messages: history, images: images.map((a) => a.blob), maxTokens: 900, temperature: context ? 0.3 : 0.6,
        onToken: (tok) => setDraft((d) => d + tok),
      });
      if (!text.trim()) text = lang === "ar" ? "(لا يوجد رد)" : "(no response)";
      thread = await saveThread({ ...thread, messages: [...thread.messages, { role: "assistant", content: text, sources, at: Date.now() }] });
      await logEvent(user.username, "chat", "chat.message", query.slice(0, 120), { threadId: thread.id });
    } catch (e) {
      thread = await saveThread({ ...thread, messages: [...thread.messages, { role: "assistant", content: t.err + errText(e, lang), error: true, at: Date.now() }] });
    } finally {
      setPhase(null); setDraft("");
    }
  };

  // Synchronous guard: state updates are async, so a fast double Enter/click
  // could otherwise send the same message twice.
  const sendingRef = useRef(false);
  const send = async (textArg, opts = {}) => {
    const text = (textArg ?? input).trim();
    if ((!text && !attachments.length) || busy || sendingRef.current) return;
    sendingRef.current = true;
    const images = attachments;
    setInput(""); setAttachments([]);
    let thread = active || await createThread(user.username, text.slice(0, 60) || (lang === "ar" ? "صورة" : "Image"));
    if (!active) { setActiveId(thread.id); history.replaceState(null, "", `#/chat/${thread.id}`); }
    const msg = { role: "user", content: text || (lang === "ar" ? "صف هذه الصورة." : "Describe this image."), images: images.map((a) => a.url), at: Date.now() };
    thread = await saveThread({ ...thread, title: thread.title || text.slice(0, 60), messages: [...thread.messages, msg] });
    run(thread, msg.content, images, opts).finally(() => { sendingRef.current = false; });
  };

  const regenerate = async () => {
    if (!active || busy) return;
    const msgs = [...active.messages];
    while (msgs.length && msgs[msgs.length - 1].role === "assistant") msgs.pop();
    const lastUser = msgs[msgs.length - 1];
    if (!lastUser) return;
    if (sendingRef.current) return;
    sendingRef.current = true;
    const thread = await saveThread({ ...active, messages: msgs });
    run(thread, lastUser.content, []).finally(() => { sendingRef.current = false; });
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
  };
  const onPaste = (e) => {
    const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith("image/"));
    if (files.length) { e.preventDefault(); addImages(files); }
  };

  const sidePanel = (
    <SidePanel lang={lang} t={t} user={user} threads={threads} docs={docs} activeId={activeId} openThread={openThread}
      newChat={newChat} onDelete={setConfirmDel} tab={panel} setTab={setPanel} />
  );

  return (
    <div className="oc-page oc-chat-h" style={{ maxWidth: 1240, marginInline: "auto", minHeight: 440, display: "flex", gap: 14 }}>
      <Card padded={false} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
          <span className="oc-mobile-only"><IconButton icon={History} title={t.chats} onClick={() => setSheet("chats")} /></span>
          <div style={{ fontWeight: 700, fontSize: 14.5, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {active?.title || t.newChat}
          </div>
          {active && messages.length > 0 && !busy && <IconButton icon={RefreshCw} title={t.regenerate} onClick={regenerate} />}
          {active && <IconButton icon={Trash2} title={t.deleteChat} onClick={() => setConfirmDel(active)} />}
          <span className="oc-mobile-only"><IconButton icon={BookOpen} title={t.knowledge} onClick={() => setSheet("knowledge")} /></span>
          <Button size="sm" variant="ghost" icon={Plus} onClick={newChat}>{t.newChat}</Button>
        </div>

        <div ref={scrollRef} className="oc-scroll" style={{ flex: 1, overflowY: "auto", padding: "18px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
          {messages.length === 0 && !busy && (
            <div style={{ margin: "auto", textAlign: "center", maxWidth: 560, padding: "20px 6px" }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <Sparkles size={24} color="var(--accent)" />
              </div>
              <div className="oc-display" style={{ fontSize: 24, fontWeight: 700 }}>{t.hello}</div>
              <div style={{ fontSize: 14, color: "var(--ink-soft)", marginTop: 6, lineHeight: 1.55 }}>{t.helloSub}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, marginTop: 18 }}>
                {t.suggestions.map((s, i) => (
                  <button key={s} onClick={() => { if (i === 2) setUseWeb(true); send(s, i === 2 ? { web: true } : {}); }} className="oc-press oc-focusable oc-row-hover"
                    style={{ textAlign: "start", border: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: 14, padding: "11px 13px", fontSize: 13.5, cursor: "pointer", lineHeight: 1.4 }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => <Bubble key={i} m={m} lang={lang} t={t} />)}
          {busy && (
            draft
              ? <Bubble m={{ role: "assistant", content: draft }} lang={lang} t={t} streaming />
              : <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink-faint)", fontSize: 13.5 }}>
                  <Loader2 size={15} className="oc-spin" />
                  {phase === "searching" ? `${t.searching}…` : ai.loadingKey ? (lang === "ar" ? "جارٍ تجهيز النموذج…" : "Preparing the model…") : `${t.thinking}…`}
                </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", padding: 10 }}>
          {attachments.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              {attachments.map((a, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <img src={a.url} alt="" style={{ width: 58, height: 58, objectFit: "cover", borderRadius: 12, border: "1px solid var(--border)" }} />
                  <button onClick={() => setAttachments((l) => l.filter((_, j) => j !== i))} aria-label="Remove"
                    style={{ position: "absolute", top: -6, insetInlineEnd: -6, width: 20, height: 20, borderRadius: 99, border: "none", background: "var(--ink)", color: "var(--bg)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, background: "var(--surface-sunken)", border: "1px solid var(--border)", borderRadius: 18, padding: "6px 6px 6px 12px" }}>
            <textarea ref={taRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey} onPaste={onPaste} rows={1}
              placeholder={t.placeholder} aria-label={t.placeholder}
              style={{ flex: 1, border: "none", background: "transparent", resize: "none", outline: "none", fontSize: 15, lineHeight: 1.5, padding: "7px 0", maxHeight: 180 }} />
            {busy
              ? <IconButton icon={Square} title={t.stop} onClick={stopGenerating} style={{ background: "var(--ink)", color: "var(--bg)", borderRadius: 13 }} />
              : <IconButton icon={Send} title="Send" onClick={() => send()} disabled={!input.trim() && !attachments.length}
                  style={{ background: input.trim() || attachments.length ? "var(--accent)" : "var(--border)", color: "#fff", borderRadius: 13 }} />}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            <Toggle on={useKb} set={setUseKb} icon={BookOpen} label={`${t.useKb}${docs.length ? ` · ${docs.length}` : ""}`} />
            <Toggle on={useWeb} set={setUseWeb} icon={Globe} label={t.useWeb} />
            <Toggle on={false} set={() => fileRef.current?.click()} icon={ImagePlus} label={t.attach} />
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addImages(e.target.files || []); e.target.value = ""; }} />
          </div>
        </div>
      </Card>

      <div className="oc-desktop-only" style={{ width: 320, flexShrink: 0, display: "flex" }}>{sidePanel}</div>

      <Sheet open={Boolean(sheet)} onClose={() => setSheet(null)} title={sheet === "knowledge" ? t.kbTitle : t.chats}>
        <SidePanel lang={lang} t={t} user={user} threads={threads} docs={docs} activeId={activeId} openThread={openThread}
          newChat={newChat} onDelete={setConfirmDel} tab={sheet || "chats"} setTab={setSheet} bare />
      </Sheet>
      <Sheet open={Boolean(confirmDel)} onClose={() => setConfirmDel(null)} title={t.confirmDelete}
        footer={<>
          <Button variant="ghost" onClick={() => setConfirmDel(null)}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
          <Button variant="danger" icon={Trash2} onClick={async () => { const id = confirmDel.id; setConfirmDel(null); await deleteThread(id); if (id === activeId) newChat(); }}>{lang === "ar" ? "حذف" : "Delete"}</Button>
        </>}>
        <div style={{ fontSize: 14, color: "var(--ink-soft)" }}>{confirmDel?.title}</div>
      </Sheet>
    </div>
  );
}

function Toggle({ on, set, icon: I, label }) {
  return (
    <button onClick={() => set(!on)} aria-pressed={on} className="oc-press oc-focusable"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 99, padding: "6px 11px", fontSize: 12.5, fontWeight: 650, cursor: "pointer",
        border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`, background: on ? "var(--accent-soft)" : "var(--surface)", color: on ? "var(--accent)" : "var(--ink-soft)" }}>
      <I size={13} /> {label}
    </button>
  );
}

function Bubble({ m, lang, t, streaming }) {
  const isUser = m.role === "user";
  const [copied, copy] = useCopy();
  return (
    <div className="oc-fade-up" style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", gap: 5 }}>
      {m.images?.length > 0 && (
        <div style={{ display: "flex", gap: 6 }}>{m.images.map((src, i) => <img key={i} src={src} alt="" style={{ maxWidth: 160, maxHeight: 160, borderRadius: 14, border: "1px solid var(--border)" }} />)}</div>
      )}
      <div style={{
        maxWidth: "min(760px, 88%)", background: isUser ? "var(--accent)" : m.error ? "var(--danger-soft)" : "var(--surface-sunken)",
        color: isUser ? "#fff" : "var(--ink)", padding: "10px 14px", borderRadius: 20,
        borderEndEndRadius: isUser ? 6 : 20, borderEndStartRadius: isUser ? 20 : 6, fontSize: 14.5, lineHeight: 1.55,
      }}>
        {isUser ? <span style={{ whiteSpace: "pre-wrap" }}>{m.content}</span> : <Markdown text={m.content} streaming={streaming} />}
      </div>
      {!isUser && !streaming && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", maxWidth: "88%" }}>
          {m.sources?.map((s) => s.url
            ? <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}><Badge tone="accent" icon={ExternalLink}>{s.label} · {s.title.slice(0, 32)}</Badge></a>
            : <Badge key={s.label} tone="neutral" icon={FileText}>{s.label} · {s.title.slice(0, 32)}</Badge>)}
          <button onClick={() => copy(m.content)} title={t.copy || "Copy"} className="oc-press oc-focusable"
            style={{ border: "none", background: "none", color: "var(--ink-faint)", cursor: "pointer", display: "inline-flex", padding: 4 }}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      )}
    </div>
  );
}

function SidePanel({ lang, t, user, threads, docs, activeId, openThread, newChat, onDelete, tab, setTab, bare }) {
  const [text, setText] = useState("");
  const [reading, setReading] = useState(false);
  const [err, setErr] = useState(null);
  const fileRef = useRef(null);

  const addText = async () => {
    if (!text.trim()) return;
    await addDoc(user.username, { title: text.trim().split("\n")[0].slice(0, 60), content: text, source: "chat" });
    setText(""); toast(t.added);
  };
  const upload = async (file) => {
    if (!file) return;
    setReading(true); setErr(null);
    try {
      const r = await readFile(file);
      if (!r.text.trim()) throw new Error(lang === "ar" ? "لا يوجد نص قابل للقراءة. للصور استخدم «ذكاء المستندات»." : "No readable text found. For images or scans, use Document Intelligence.");
      await addDoc(user.username, { title: file.name, content: r.text, source: "upload", meta: { pages: r.pages } });
      toast(t.added);
    } catch (e) { setErr(t.readFail + errText(e, lang)); }
    finally { setReading(false); }
  };

  const body = tab === "knowledge" ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0, flex: 1 }}>
      <div style={{ fontSize: 12.5, color: "var(--ink-faint)", lineHeight: 1.45 }}>{t.kbDesc}</div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t.kbPaste} rows={3} className="oc-input" style={{ fontSize: 13.5 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <Button size="sm" variant="subtle" icon={Plus} onClick={addText} disabled={!text.trim()}>{t.kbAdd}</Button>
        <Button size="sm" variant="subtle" icon={Upload} loading={reading} onClick={() => fileRef.current?.click()}>{t.kbUpload}</Button>
        <input ref={fileRef} type="file" accept={ACCEPT} hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      {err && <Notice tone="danger">{err}</Notice>}
      <div className="oc-scroll" style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, flex: 1, minHeight: 0, maxHeight: bare ? "50vh" : undefined }}>
        {docs.length === 0 && <div style={{ fontSize: 12.5, color: "var(--ink-faint)", padding: "8px 2px" }}>{t.kbEmpty}</div>}
        {docs.map((d) => (
          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--border)", borderRadius: 12, padding: "8px 10px", background: "var(--surface-2)" }}>
            <FileText size={15} color="var(--ink-faint)" style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</div>
              <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{d.content.length.toLocaleString()} {t.chars} · {d.source}</div>
            </div>
            <IconButton icon={Trash2} size={28} title="Delete" onClick={() => removeDoc(d.id)} />
          </div>
        ))}
      </div>
    </div>
  ) : (
    <div className="oc-scroll" style={{ display: "flex", flexDirection: "column", gap: 4, overflowY: "auto", flex: 1, minHeight: 0, maxHeight: bare ? "60vh" : undefined }}>
      <Button variant="subtle" icon={Plus} onClick={newChat} style={{ justifyContent: "flex-start", marginBottom: 6 }}>{t.newChat}</Button>
      {threads.length === 0 && <div style={{ fontSize: 12.5, color: "var(--ink-faint)", padding: "8px 2px" }}>{t.noThreads}</div>}
      {threads.map((th) => (
        <div key={th.id} className="oc-row-hover" style={{ display: "flex", alignItems: "center", gap: 6, borderRadius: 12, background: th.id === activeId ? "var(--accent-soft)" : "transparent" }}>
          <button onClick={() => openThread(th.id)} className="oc-focusable" style={{ flex: 1, minWidth: 0, textAlign: "start", border: "none", background: "none", cursor: "pointer", padding: "9px 10px" }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: th.id === activeId ? "var(--accent)" : "var(--ink)" }}>
              <MessageSquare size={13} style={{ verticalAlign: -2, marginInlineEnd: 6 }} />{th.title || "…"}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>{th.messages.length} · {timeAgo(th.updatedAt, lang)}</div>
          </button>
          <IconButton icon={Trash2} size={28} title="Delete" onClick={() => onDelete(th)} />
        </div>
      ))}
    </div>
  );

  if (bare) return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{body}</div>;
  return (
    <Card style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minHeight: 0, padding: 14 }}>
      <Segmented value={tab} onChange={setTab} size="sm" options={[
        { value: "chats", label: t.chats, icon: MessageSquare, count: threads.length },
        { value: "knowledge", label: t.knowledge, icon: BookOpen, count: docs.length },
      ]} />
      {body}
    </Card>
  );
}
