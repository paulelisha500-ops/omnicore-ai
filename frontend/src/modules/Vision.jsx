import React, { useEffect, useRef, useState } from "react";
import { Camera, Upload, Sparkles, ScanText, MessageCircleQuestion, Eye, Trash2, Square, Copy, Check, ImageIcon } from "lucide-react";
import { Card, CardTitle, SectionHeader, ModuleShell, Button, Badge, Markdown, Notice, EmptyState, SkeletonLines, Segmented, Sheet, useCopy } from "../ui.jsx";
import { addRecord, deleteRecord, useRecords, logEvent, errText, timeAgo } from "../lib/data.js";
import { downscale } from "../lib/docs.js";
import { generate, stopGenerating, readImageText, useAI } from "../lib/ai.js";

const T = {
  en: {
    eyebrow: "Module 02", title: "Computer Vision",
    desc: "Understand any image: describe the scene and objects, read text in the image (multilingual), or ask your own question about it.",
    drop: "Drop an image, paste one, or click to browse", camera: "Take photo",
    modes: { describe: "Describe", ocr: "Read text", ask: "Ask" }, askPh: "e.g. Is anyone wearing a safety helmet?",
    run: "Analyze image", running: "Looking at the image", scene: "Scene", objects: "Objects", text: "Text in image", notes: "Observations",
    history: "Analyzed images", noHistory: "Images you analyze appear here.", err: "Couldn't analyze: ", none: "None found",
    note: "Online: Qwen3-VL on Hugging Face reads the image. On-device mode: Qwen3.5 runs in your browser. It describes what it sees; it doesn't draw pixel-level boxes.",
  },
  ar: {
    eyebrow: "الوحدة 02", title: "الرؤية الحاسوبية",
    desc: "افهم أي صورة: صف المشهد والعناصر، اقرأ النص داخل الصورة (بعدة لغات)، أو اطرح سؤالك الخاص عنها.",
    drop: "أسقط صورة أو الصقها أو انقر للاختيار", camera: "التقط صورة",
    modes: { describe: "وصف", ocr: "قراءة النص", ask: "سؤال" }, askPh: "مثال: هل يرتدي أحد خوذة أمان؟",
    run: "تحليل الصورة", running: "جارٍ النظر في الصورة", scene: "المشهد", objects: "العناصر", text: "النص في الصورة", notes: "ملاحظات",
    history: "الصور المحلَّلة", noHistory: "تظهر هنا الصور التي تحللها.", err: "تعذّر التحليل: ", none: "لا يوجد",
    note: "عبر الإنترنت: يقرأ Qwen3-VL الصورة على Hugging Face. على الجهاز: يعمل Qwen3.5 في متصفحك. يصف ما يراه؛ ولا يرسم صناديق على مستوى البكسل.",
  },
};

function parseDescribe(raw) {
  const s = String(raw || "");
  const sec = (names) => {
    const re = new RegExp(`(?:${names})\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:SCENE|OBJECTS|TEXT|NOTES|المشهد|العناصر|النص|ملاحظات)\\s*:|$)`, "i");
    return (s.match(re)?.[1] || "").trim();
  };
  const scene = sec("SCENE|المشهد");
  const objects = sec("OBJECTS|العناصر").split(/[,،\n]/).map((x) => x.replace(/^\s*[-*•]\s*/, "").trim()).filter((x) => x && x.length < 60).slice(0, 12);
  const text = sec("TEXT|النص");
  const notes = sec("NOTES|ملاحظات").split("\n").map((l) => l.replace(/^\s*([-*•]|\d+[.)])\s*/, "").trim()).filter(Boolean).slice(0, 5);
  if (!scene && !objects.length) return { scene: s.trim(), objects: [], text: "", notes: [] };
  return { scene, objects, text: /^(none|no text|n\/a|لا يوجد)\.?$/i.test(text) ? "" : text, notes };
}

async function toDataUrl(blob) {
  return new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
}

export default function Vision({ lang, user }) {
  const t = T[lang];
  const fileRef = useRef(null);
  const camRef = useRef(null);
  const [img, setImg] = useState(null); // { blob, url }
  const [mode, setMode] = useState("describe");
  const [question, setQuestion] = useState("");
  const [running, setRunning] = useState(false);
  const [stream, setStream] = useState("");
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const [drag, setDrag] = useState(false);
  const [view, setView] = useState(null);
  const [history] = useRecords(user.username, "vision");
  const [copied, copy] = useCopy();

  useEffect(() => {
    const onPaste = (e) => { const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith("image/")); if (f) pick(f); };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const pick = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setResult(null); setErr(null); setStream("");
    const blob = await downscale(file, 1600);
    setImg({ blob, url: URL.createObjectURL(blob) });
  };

  const run = async () => {
    if (!img || running) return;
    setRunning(true); setResult(null); setErr(null); setStream("");
    const ar = lang === "ar";
    const prompts = {
      describe: ar
        ? "حلّل الصورة وأجب بهذا الشكل بالضبط:\nالمشهد: وصف من جملتين\nالعناصر: قائمة مفصولة بفواصل لأهم 5-10 عناصر\nالنص: أي نص مقروء، أو «لا يوجد»\nملاحظات:\n- ملاحظة مهنية\n- ملاحظة مهنية"
        : "Analyze the image and answer in exactly this format:\nSCENE: a two-sentence description\nOBJECTS: comma-separated list of the 5-10 most notable objects\nTEXT: any readable text, or \"none\"\nNOTES:\n- a professional observation\n- a professional observation",
      ocr: ar ? "انسخ كل النص المقروء في الصورة كما هو، مع الحفاظ على الأسطر. لا تضف أي تعليق." : "Transcribe all readable text in the image exactly, preserving line breaks. Add no commentary.",
      ask: question.trim() || (ar ? "صف الصورة." : "Describe the image."),
    };
    try {
      const raw = mode === "ocr"
        ? (await readImageText(img.blob, { lang, onToken: (tok) => setStream((s) => s + tok) })) || (ar ? "لم يُعثر على نص مقروء." : "No readable text found.")
        : await generate({
          system: ar ? "أنت محرك رؤية حاسوبية دقيق. صف فقط ما تراه فعليًا." : "You are a precise computer-vision engine. Only describe what is actually visible.",
          prompt: prompts[mode], images: [img.blob], maxTokens: 480, temperature: 0.4,
          imageMaxSide: 640, onToken: (tok) => setStream((s) => s + tok),
        });
      const res = mode === "describe" ? { mode, ...parseDescribe(raw), raw } : { mode, raw, question: mode === "ask" ? prompts.ask : "" };
      setResult(res);
      const small = await downscale(img.blob, 280);
      await addRecord(user.username, "vision", { thumb: await toDataUrl(small), ...res });
      await logEvent(user.username, "vision", "image.analyzed", mode === "ask" ? prompts.ask.slice(0, 80) : t.modes[mode]);
    } catch (e) { setErr((e.declined ? "" : t.err) + errText(e, lang)); }
    finally { setRunning(false); setStream(""); }
  };

  return (
    <ModuleShell>
      <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc} />
      <div className="oc-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start" }}>
        <Card>
          <div onClick={() => fileRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }} role="button" tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()} className="oc-focusable"
            style={{ border: `2px dashed ${drag ? "var(--accent)" : "var(--border-strong)"}`, borderRadius: 16, minHeight: 230, cursor: "pointer",
              background: drag ? "var(--accent-soft)" : "var(--surface-sunken)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", transition: "all .2s" }}>
            {img ? <img src={img.url} alt="" style={{ maxWidth: "100%", maxHeight: 340, display: "block" }} /> : (
              <div style={{ textAlign: "center", padding: 20 }}>
                <ImageIcon size={28} color="var(--accent)" style={{ marginBottom: 10 }} />
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>{t.drop}</div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
          <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <Button variant="ghost" size="sm" icon={Upload} onClick={() => fileRef.current?.click()}>{lang === "ar" ? "اختيار صورة" : "Choose image"}</Button>
            <Button variant="ghost" size="sm" icon={Camera} onClick={() => camRef.current?.click()}>{t.camera}</Button>
          </div>
          <div style={{ marginTop: 14 }}>
            <Segmented value={mode} onChange={setMode} options={[
              { value: "describe", label: t.modes.describe, icon: Eye },
              { value: "ocr", label: t.modes.ocr, icon: ScanText },
              { value: "ask", label: t.modes.ask, icon: MessageCircleQuestion },
            ]} />
          </div>
          {mode === "ask" && <input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()} placeholder={t.askPh} className="oc-input" style={{ marginTop: 10 }} />}
          <div style={{ marginTop: 12 }}>
            {running
              ? <Button variant="ghost" icon={Square} onClick={stopGenerating}>{lang === "ar" ? "إيقاف" : "Stop"}</Button>
              : <Button variant="accent" icon={Sparkles} onClick={run} disabled={!img || (mode === "ask" && !question.trim())}>{t.run}</Button>}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 12, lineHeight: 1.5 }}>{t.note}</div>
        </Card>

        <Card>
          {err && <Notice tone="danger">{err}</Notice>}
          {!result && !running && !err && <EmptyState icon={Eye} body={lang === "ar" ? "اختر صورة ثم اضغط «تحليل الصورة»." : "Choose an image, then press Analyze image."} />}
          {running && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 650, marginBottom: 10 }}><Sparkles size={15} color="var(--spark)" /> {t.running}…</div>
              {stream ? <div style={{ fontSize: 13.5, color: "var(--ink-soft)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{stream}</div> : <SkeletonLines n={5} />}
            </div>
          )}
          {result && <VisionResult r={result} t={t} copied={copied} copy={copy} />}
        </Card>
      </div>

      <Card style={{ marginTop: 14 }}>
        <CardTitle>{t.history}</CardTitle>
        {history.length === 0 ? <EmptyState icon={ImageIcon} body={t.noHistory} /> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
            {history.slice(0, 24).map((h) => (
              <button key={h.id} onClick={() => setView(h)} className="oc-press oc-focusable" style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 0, overflow: "hidden", background: "var(--surface-2)", cursor: "pointer", textAlign: "start" }}>
                <img src={h.thumb} alt="" style={{ width: "100%", height: 96, objectFit: "cover", display: "block" }} />
                <div style={{ padding: "7px 9px" }}>
                  <div style={{ fontSize: 12, fontWeight: 650 }}>{t.modes[h.mode]}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{timeAgo(h.at, lang)}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Sheet open={Boolean(view)} onClose={() => setView(null)} title={view ? t.modes[view.mode] : ""}
        footer={<Button variant="danger" size="sm" icon={Trash2} onClick={async () => { await deleteRecord(view.id); setView(null); }}>{lang === "ar" ? "حذف" : "Delete"}</Button>}>
        {view && (<>
          <img src={view.thumb} alt="" style={{ width: "100%", maxHeight: 240, objectFit: "contain", borderRadius: 12, background: "var(--surface-sunken)" }} />
          <div style={{ marginTop: 12 }}><VisionResult r={view} t={t} copied={copied} copy={copy} /></div>
        </>)}
      </Sheet>
    </ModuleShell>
  );
}

function VisionResult({ r, t, copied, copy }) {
  if (r.mode !== "describe") {
    return (
      <div className="oc-fade-up">
        {r.question && <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 8 }}>“{r.question}”</div>}
        <div style={{ fontSize: 14.5, lineHeight: 1.65, whiteSpace: r.mode === "ocr" ? "pre-wrap" : undefined }}>{r.mode === "ocr" ? r.raw : <Markdown text={r.raw} />}</div>
        <div style={{ marginTop: 12 }}><Button size="sm" variant="ghost" icon={copied ? Check : Copy} onClick={() => copy(r.raw)}>{copied ? "Copied" : "Copy"}</Button></div>
      </div>
    );
  }
  return (
    <div className="oc-fade-up" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div><div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{t.scene}</div><div style={{ fontSize: 14.5, lineHeight: 1.6 }}>{r.scene}</div></div>
      {r.objects?.length > 0 && <div><div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{t.objects}</div><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{r.objects.map((o, i) => <Badge key={i} tone="accent">{o}</Badge>)}</div></div>}
      <div><div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{t.text}</div>
        {r.text ? <div className="oc-mono" style={{ fontSize: 12.5, background: "var(--surface-sunken)", borderRadius: 10, padding: 10, whiteSpace: "pre-wrap" }}>{r.text}</div> : <div style={{ fontSize: 13, color: "var(--ink-faint)" }}>{t.none}</div>}
      </div>
      {r.notes?.length > 0 && <div><div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{t.notes}</div><ul style={{ margin: 0, paddingInlineStart: 20, fontSize: 14, lineHeight: 1.7 }}>{r.notes.map((n, i) => <li key={i}>{n}</li>)}</ul></div>}
    </div>
  );
}
