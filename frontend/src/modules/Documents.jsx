import React, { useRef, useState } from "react";
import { Upload, FileText, Sparkles, Send, BookMarked, CheckCircle2, Trash2, X, Clock, Hash, Layers, ClipboardPaste, History, Square } from "lucide-react";
import { Card, CardTitle, SectionHeader, ModuleShell, Button, Badge, Markdown, Notice, EmptyState, SkeletonLines, ProgressBar, toast } from "../ui.jsx";
import { addDoc, addRecord, deleteRecord, useRecords, logEvent, errText, timeAgo } from "../lib/data.js";
import { readFile, chunkText, wordCount, ACCEPT } from "../lib/docs.js";
import { generate, stopGenerating } from "../lib/ai.js";
import { rank } from "../lib/search.js";

const T = {
  en: {
    eyebrow: "Module 03", title: "Document Intelligence",
    desc: "Drop in a PDF, Word file, text, or a photo of a page. The on-device model reads it, summarizes it and answers your questions — the file never leaves this device.",
    drop: "Drop a file or click to browse", dropSub: "PDF · Word (.docx) · TXT · Markdown · CSV · HTML · images", paste: "Paste text instead",
    pastePh: "Paste document text here…", usePaste: "Use this text", analyze: "Analyze", analyzing: "Analyzing", reading: "Reading file…",
    ocr: "Reading the page image…", part: "Summarizing part", combine: "Combining",
    summary: "Summary", points: "Key points", type: "Document type", ask: "Ask about this document", askPh: "e.g. What are the payment terms?",
    save: "Save to knowledge base", saved: "Saved", words: "words", pages: "pages", minRead: "min read", clear: "Clear",
    history: "Recent analyses", noHistory: "Analyses you run appear here.", coverage: "Long document: summarized from the first {n}% of the text.",
    extracted: "Extracted text", showText: "Show text", hideText: "Hide text", err: "Couldn't analyze: ",
  },
  ar: {
    eyebrow: "الوحدة 03", title: "ذكاء المستندات",
    desc: "أسقط ملف PDF أو Word أو نصًا أو صورة صفحة. يقرأه النموذج على جهازك ويلخّصه ويجيب عن أسئلتك — ولا يغادر الملف جهازك.",
    drop: "أسقط ملفًا أو انقر للاختيار", dropSub: "PDF · Word (.docx) · TXT · Markdown · CSV · HTML · صور", paste: "الصق نصًا بدلًا من ذلك",
    pastePh: "الصق نص المستند هنا…", usePaste: "استخدم هذا النص", analyze: "تحليل", analyzing: "جارٍ التحليل", reading: "جارٍ قراءة الملف…",
    ocr: "جارٍ قراءة صورة الصفحة…", part: "تلخيص الجزء", combine: "جارٍ الدمج",
    summary: "الملخص", points: "النقاط الرئيسية", type: "نوع المستند", ask: "اسأل عن هذا المستند", askPh: "مثال: ما شروط الدفع؟",
    save: "حفظ في قاعدة المعرفة", saved: "تم الحفظ", words: "كلمة", pages: "صفحات", minRead: "دقيقة قراءة", clear: "مسح",
    history: "التحليلات الأخيرة", noHistory: "تظهر هنا التحليلات التي تجريها.", coverage: "مستند طويل: لُخِّص من أول {n}% من النص.",
    extracted: "النص المستخرج", showText: "إظهار النص", hideText: "إخفاء النص", err: "تعذّر التحليل: ",
  },
};

const MAX_PARTS = 6;
const PART = 5500;

function parseAnalysis(raw) {
  const s = String(raw || "");
  const grab = (label, next) => {
    const re = new RegExp(`${label}\\s*:?\\s*([\\s\\S]*?)(?=\\n\\s*(?:${next})\\s*:|$)`, "i");
    return (s.match(re)?.[1] || "").trim();
  };
  const summary = grab("(?:SUMMARY|الملخص)", "KEY POINTS|النقاط|DOCUMENT TYPE|نوع");
  const pointsRaw = grab("(?:KEY POINTS|النقاط الرئيسية)", "DOCUMENT TYPE|نوع المستند");
  const docType = grab("(?:DOCUMENT TYPE|نوع المستند)", "$^");
  const points = pointsRaw.split("\n").map((l) => l.replace(/^\s*([-*•]|\d+[.)])\s*/, "").trim()).filter(Boolean).slice(0, 8);
  return { summary: summary || s.trim(), points, docType: docType.split("\n")[0].slice(0, 80) };
}

export default function Documents({ lang, user }) {
  const t = T[lang];
  const fileRef = useRef(null);
  const [doc, setDoc] = useState(null); // { name, kind, text, images, pages, previewUrl }
  const [pasting, setPasting] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [stream, setStream] = useState("");
  const [err, setErr] = useState(null);
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showText, setShowText] = useState(false);
  const [drag, setDrag] = useState(false);
  const [history] = useRecords(user.username, "document");
  const busy = Boolean(status);

  const reset = () => { setResult(null); setStream(""); setErr(null); setAnswer(""); setSaved(false); setShowText(false); };

  const load = async (file) => {
    if (!file) return;
    reset(); setDoc(null); setStatus(t.reading); setProgress(null);
    try {
      const r = await readFile(file, (p) => setProgress(p));
      setDoc({ name: file.name, kind: r.kind, text: r.text, images: r.images || [], pages: r.pages,
        previewUrl: r.kind === "image" ? URL.createObjectURL(r.images[0]) : null });
    } catch (e) { setErr(errText(e, lang)); }
    finally { setStatus(null); setProgress(null); }
  };

  const usePasted = () => {
    if (!pasteText.trim()) return;
    reset();
    setDoc({ name: pasteText.trim().split("\n")[0].slice(0, 50) || "Pasted text", kind: "text", text: pasteText.trim(), images: [] });
    setPasting(false); setPasteText("");
  };

  const analyze = async () => {
    if (!doc) return;
    reset();
    const ar = lang === "ar";
    try {
      let text = doc.text;
      // Images and scanned PDFs: transcribe with the vision model first, so the
      // text becomes searchable, askable and saveable — not just summarized.
      if (!text.trim() && doc.images.length) {
        setStatus(t.ocr);
        const pagesText = [];
        for (const img of doc.images) {
          const tx = await generate({
            system: "You transcribe documents. Output only the text visible in the image, preserving line breaks. No commentary.",
            prompt: ar ? "انسخ كل النص الظاهر في هذه الصفحة كما هو." : "Transcribe all text on this page exactly.",
            images: [img], maxTokens: 900, temperature: 0, imageMaxSide: 1024, onToken: (tok) => setStream((s) => s + tok),
          });
          pagesText.push(tx); setStream("");
        }
        text = pagesText.join("\n\n").trim();
        setDoc((d) => ({ ...d, text }));
      }
      if (!text.trim()) throw new Error(ar ? "لم يُعثر على نص في هذا الملف." : "No text was found in this file.");

      const instr = ar
        ? "حلّل المستند وأجب بهذا الشكل بالضبط:\nالملخص: فقرة من 2-4 جمل\nالنقاط الرئيسية:\n- نقطة\n- نقطة\nنوع المستند: (مثل عقد، فاتورة، تقرير)"
        : "Analyze the document and answer in exactly this format:\nSUMMARY: a 2-4 sentence paragraph\nKEY POINTS:\n- point\n- point\nDOCUMENT TYPE: (e.g. contract, invoice, report)";
      const sys = ar ? "أنت محرك دقيق لتحليل المستندات. لا تخترع معلومات غير موجودة في النص." : "You are a precise document-analysis engine. Never add facts that aren't in the text.";
      const parts = chunkText(text, PART);
      let coverage = 100;
      let final;
      if (parts.length === 1) {
        setStatus(t.analyzing);
        final = await generate({ system: sys, prompt: `${instr}\n\nDOCUMENT:\n${text}`, maxTokens: 520, temperature: 0.3, onToken: (tok) => setStream((s) => s + tok) });
      } else {
        const use = parts.slice(0, MAX_PARTS);
        coverage = Math.round((use.join("").length / text.length) * 100);
        const notes = [];
        for (let i = 0; i < use.length; i++) {
          setStatus(`${t.part} ${i + 1}/${use.length}`);
          setStream("");
          notes.push(await generate({
            system: sys, maxTokens: 260, temperature: 0.3, onToken: (tok) => setStream((s) => s + tok),
            prompt: `${ar ? "لخّص هذا الجزء في 3-5 نقاط موجزة:" : "Summarize this part in 3-5 concise bullet points:"}\n\n${use[i]}`,
          }));
        }
        setStatus(t.combine); setStream("");
        final = await generate({ system: sys, prompt: `${instr}\n\n${ar ? "ملاحظات الأجزاء" : "NOTES FROM EACH PART"}:\n${notes.map((n, i) => `Part ${i + 1}:\n${n}`).join("\n\n")}`, maxTokens: 520, temperature: 0.3, onToken: (tok) => setStream((s) => s + tok) });
      }
      const parsed = { ...parseAnalysis(final), coverage };
      setResult(parsed);
      await addRecord(user.username, "document", { name: doc.name, summary: parsed.summary, points: parsed.points, docType: parsed.docType, words: wordCount(text) });
      await logEvent(user.username, "documents", "document.analyzed", doc.name);
    } catch (e) {
      if (!e.declined) setErr(t.err + errText(e, lang)); else setErr(errText(e, lang));
    } finally { setStatus(null); setStream(""); }
  };

  const ask = async () => {
    if (!q.trim() || !doc?.text) return;
    setAsking(true); setAnswer("");
    try {
      const chunks = chunkText(doc.text, 1400).map((body, i) => ({ id: String(i), type: "doc", title: `Part ${i + 1}`, body }));
      const hits = chunks.length > 4 ? rank(q, chunks, 4) : chunks;
      const ctx = (hits.length ? hits : chunks.slice(0, 3)).map((h) => `[${h.title}]\n${h.body}`).join("\n\n");
      await generate({
        system: lang === "ar" ? "أجب بإيجاز ومن المستند فقط. إن لم يكن الجواب فيه فقل ذلك." : "Answer briefly and only from the document excerpts. If the answer isn't there, say so.",
        prompt: `DOCUMENT EXCERPTS:\n${ctx}\n\nQUESTION: ${q}`, maxTokens: 400, temperature: 0.3,
        onToken: (tok) => setAnswer((a) => a + tok),
      });
    } catch (e) { setAnswer(t.err + errText(e, lang)); }
    finally { setAsking(false); }
  };

  const save = async () => {
    await addDoc(user.username, { title: doc.name, content: doc.text || result?.summary || "", source: "documents", meta: { pages: doc.pages } });
    setSaved(true); toast(t.saved);
  };

  const onDrop = (e) => { e.preventDefault(); setDrag(false); load(e.dataTransfer.files?.[0]); };
  const words = doc?.text ? wordCount(doc.text) : 0;

  return (
    <ModuleShell>
      <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc} />
      <div className="oc-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start" }}>
        <Card>
          {!doc && !pasting && (
            <div onClick={() => fileRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
              role="button" tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()} className="oc-press oc-focusable"
              style={{ border: `2px dashed ${drag ? "var(--accent)" : "var(--border-strong)"}`, background: drag ? "var(--accent-soft)" : "var(--surface-sunken)",
                borderRadius: 16, padding: "38px 18px", textAlign: "center", cursor: "pointer", transition: "all .2s" }}>
              <Upload size={26} color="var(--accent)" style={{ marginBottom: 10 }} />
              <div style={{ fontSize: 15, fontWeight: 700 }}>{t.drop}</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginTop: 5 }}>{t.dropSub}</div>
            </div>
          )}
          <input ref={fileRef} type="file" accept={ACCEPT} hidden onChange={(e) => { load(e.target.files?.[0]); e.target.value = ""; }} />
          {!doc && !pasting && (
            <div style={{ marginTop: 12 }}><Button variant="ghost" size="sm" icon={ClipboardPaste} onClick={() => setPasting(true)}>{t.paste}</Button></div>
          )}
          {pasting && (
            <div>
              <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder={t.pastePh} rows={9} className="oc-input" autoFocus />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <Button onClick={usePasted} disabled={!pasteText.trim()}>{t.usePaste}</Button>
                <Button variant="ghost" onClick={() => setPasting(false)}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
              </div>
            </div>
          )}
          {status && !doc && <div style={{ marginTop: 12 }}><div style={{ fontSize: 13, marginBottom: 6 }}>{status}</div><ProgressBar value={progress} /></div>}
          {doc && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {doc.previewUrl
                  ? <img src={doc.previewUrl} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 12, border: "1px solid var(--border)" }} />
                  : <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}><FileText size={22} color="var(--accent)" /></div>}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    <Badge>{doc.kind.toUpperCase()}</Badge>
                    {doc.pages ? <Badge icon={Layers}>{doc.pages} {t.pages}</Badge> : null}
                    {words ? <Badge icon={Hash}>{words.toLocaleString()} {t.words}</Badge> : null}
                    {words ? <Badge icon={Clock}>{Math.max(1, Math.round(words / 230))} {t.minRead}</Badge> : null}
                  </div>
                </div>
                <Button variant="ghost" size="sm" icon={X} onClick={() => { setDoc(null); reset(); }} disabled={busy}>{t.clear}</Button>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                {busy
                  ? <Button variant="ghost" icon={Square} onClick={stopGenerating}>{lang === "ar" ? "إيقاف" : "Stop"}</Button>
                  : <Button variant="accent" icon={Sparkles} onClick={analyze}>{t.analyze}</Button>}
                {doc.text && <Button variant="ghost" onClick={() => setShowText((v) => !v)}>{showText ? t.hideText : t.showText}</Button>}
              </div>
              {showText && doc.text && (
                <div className="oc-scroll" style={{ marginTop: 12, maxHeight: 280, overflow: "auto", background: "var(--surface-sunken)", borderRadius: 12, padding: 12, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {doc.text.slice(0, 20000)}{doc.text.length > 20000 ? "…" : ""}
                </div>
              )}
            </div>
          )}
          {err && <Notice tone="danger" style={{ marginTop: 12 }}>{err}</Notice>}
        </Card>

        <Card>
          {!result && !busy && (
            <EmptyState icon={Sparkles} title={t.summary} body={lang === "ar" ? "اختر ملفًا ثم اضغط «تحليل»." : "Choose a file, then press Analyze."} />
          )}
          {busy && doc && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 650, marginBottom: 10 }}><Sparkles size={15} color="var(--spark)" /> {status}…</div>
              {stream ? <div style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.6 }}><Markdown text={stream} streaming /></div> : <SkeletonLines n={4} />}
            </div>
          )}
          {result && (
            <div className="oc-fade-up">
              <CardTitle right={result.docType ? <Badge tone="accent">{result.docType}</Badge> : null}>{t.summary}</CardTitle>
              <div style={{ fontSize: 14.5, lineHeight: 1.65 }}><Markdown text={result.summary} /></div>
              {result.points.length > 0 && (
                <>
                  <div style={{ fontWeight: 700, fontSize: 14, margin: "16px 0 6px" }}>{t.points}</div>
                  <ul style={{ margin: 0, paddingInlineStart: 20, fontSize: 14, lineHeight: 1.7 }}>{result.points.map((p, i) => <li key={i}>{p}</li>)}</ul>
                </>
              )}
              {result.coverage < 100 && <Notice style={{ marginTop: 12 }}>{t.coverage.replace("{n}", result.coverage)}</Notice>}
              <div style={{ marginTop: 14 }}>
                <Button variant="ghost" icon={saved ? CheckCircle2 : BookMarked} onClick={save} disabled={saved}>{saved ? t.saved : t.save}</Button>
              </div>
            </div>
          )}
          {doc?.text && !busy && (
            <div style={{ marginTop: 18, borderTop: result ? "1px solid var(--border)" : "none", paddingTop: result ? 14 : 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{t.ask}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} placeholder={t.askPh} className="oc-input" />
                <Button onClick={ask} icon={Send} loading={asking} disabled={!q.trim()} />
              </div>
              {answer && <div className="oc-fade-up" style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, background: "var(--surface-sunken)", borderRadius: 12, padding: 12 }}><Markdown text={answer} streaming={asking} /></div>}
            </div>
          )}
        </Card>
      </div>

      <Card style={{ marginTop: 14 }}>
        <CardTitle>{t.history}</CardTitle>
        {history.length === 0 ? <EmptyState icon={History} body={t.noHistory} /> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
            {history.slice(0, 12).map((h) => (
              <div key={h.id} style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 12, background: "var(--surface-2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <FileText size={15} color="var(--accent)" />
                  <div style={{ fontWeight: 650, fontSize: 13.5, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</div>
                  <button onClick={() => deleteRecord(h.id)} aria-label="Delete" className="oc-press" style={{ border: "none", background: "none", color: "var(--ink-faint)", cursor: "pointer" }}><Trash2 size={14} /></button>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 6, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{h.summary}</div>
                <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 6 }}>{timeAgo(h.at, lang)}{h.words ? ` · ${h.words.toLocaleString()} ${t.words}` : ""}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </ModuleShell>
  );
}
