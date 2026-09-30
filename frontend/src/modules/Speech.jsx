import React, { useEffect, useRef, useState } from "react";
import { Mic, StopCircle, Upload, Sparkles, Volume2, Pause, Play, Square, Download, BookMarked, Trash2, FileAudio, Radio, ShieldCheck, History, CheckCircle2 } from "lucide-react";
import { Card, CardTitle, SectionHeader, ModuleShell, Button, Badge, Notice, EmptyState, SkeletonLines, Segmented, Field, Markdown, Sheet, toast } from "../ui.jsx";
import { addDoc, addRecord, deleteRecord, useRecords, logEvent, errText, timeAgo, download } from "../lib/data.js";
import { generate, transcribe, stopGenerating, useAI, progressOf } from "../lib/ai.js";
import { decodeTo16k, startRecorder, hasWebSpeech } from "../lib/audio.js";
import { wordCount } from "../lib/docs.js";

const T = {
  en: {
    eyebrow: "Module 04", title: "Speech AI",
    desc: "Record or upload audio and get a transcript, then an AI meeting summary with decisions and action items. Read any text aloud with your device's voices.",
    engine: { whisper: "Private (Whisper on-device)", live: "Live captions (browser service)" },
    whisperNote: "Audio is transcribed by Whisper running in this tab — it never leaves your device.",
    liveNote: "Live captions use your browser's built-in speech service. In Chrome and Edge that service sends audio to Google or Microsoft for recognition.",
    noLive: "Live captions aren't available in this browser — use the private Whisper mode.",
    record: "Record", stop: "Stop", upload: "Upload audio", transcribing: "Transcribing on your device…", transcript: "Transcript",
    transcriptPh: "Your transcript appears here — or paste one to summarize.", summarize: "Summarize meeting", summarizing: "Summarizing",
    summary: "Summary", decisions: "Decisions", actions: "Action items", save: "Save to knowledge base", saved: "Saved",
    tts: "Read aloud", ttsPh: "Type or paste text to read aloud…", voice: "Voice", rate: "Speed", pitch: "Pitch",
    speak: "Speak", pause: "Pause", resume: "Resume", readSummary: "Read summary aloud", noVoices: "This browser has no speech voices installed.",
    history: "Meetings", noHistory: "Summarized meetings appear here.", words: "words", err: "Error: ",
  },
  ar: {
    eyebrow: "الوحدة 04", title: "الذكاء الصوتي",
    desc: "سجّل أو ارفع ملفًا صوتيًا لتحصل على نص مفرّغ، ثم ملخص اجتماع بالذكاء الاصطناعي مع القرارات وبنود العمل. واقرأ أي نص بصوت أجهزتك.",
    engine: { whisper: "خاص (Whisper على الجهاز)", live: "ترجمة مباشرة (خدمة المتصفح)" },
    whisperNote: "يُفرَّغ الصوت بواسطة Whisper داخل هذه الصفحة — ولا يغادر جهازك.",
    liveNote: "الترجمة المباشرة تستخدم خدمة الكلام المدمجة في المتصفح. في Chrome وEdge تُرسل هذه الخدمة الصوت إلى Google أو Microsoft.",
    noLive: "الترجمة المباشرة غير متاحة في هذا المتصفح — استخدم وضع Whisper الخاص.",
    record: "تسجيل", stop: "إيقاف", upload: "رفع ملف صوتي", transcribing: "جارٍ التفريغ على جهازك…", transcript: "النص المفرّغ",
    transcriptPh: "يظهر النص المفرّغ هنا — أو الصق نصًا لتلخيصه.", summarize: "تلخيص الاجتماع", summarizing: "جارٍ التلخيص",
    summary: "الملخص", decisions: "القرارات", actions: "بنود العمل", save: "حفظ في قاعدة المعرفة", saved: "تم الحفظ",
    tts: "القراءة بصوت عالٍ", ttsPh: "اكتب أو الصق نصًا لقراءته…", voice: "الصوت", rate: "السرعة", pitch: "طبقة الصوت",
    speak: "نطق", pause: "إيقاف مؤقت", resume: "استئناف", readSummary: "اقرأ الملخص بصوت عالٍ", noVoices: "لا توجد أصوات مثبتة في هذا المتصفح.",
    history: "الاجتماعات", noHistory: "تظهر هنا الاجتماعات الملخَّصة.", words: "كلمة", err: "خطأ: ",
  },
};

function parseMeeting(raw) {
  const s = String(raw || "");
  const sec = (a) => {
    const re = new RegExp(`(?:${a})\\s*:?\\s*([\\s\\S]*?)(?=\\n\\s*(?:SUMMARY|DECISIONS|ACTION ITEMS|الملخص|القرارات|بنود العمل)\\s*:|$)`, "i");
    return (s.match(re)?.[1] || "").trim();
  };
  const list = (x) => x.split("\n").map((l) => l.replace(/^\s*([-*•]|\d+[.)])\s*/, "").trim()).filter((l) => l && !/^(none|لا يوجد)\.?$/i.test(l));
  const summary = sec("SUMMARY|الملخص");
  return { summary: summary || s.trim(), decisions: list(sec("DECISIONS|القرارات")), actions: list(sec("ACTION ITEMS|بنود العمل")) };
}

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function Speech({ lang, user }) {
  const t = T[lang];
  const ai = useAI();
  const [engine, setEngine] = useState("whisper");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [summ, setSumm] = useState(null);
  const [stream, setStream] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [err, setErr] = useState(null);
  const [saved, setSaved] = useState(false);
  const [view, setView] = useState(null);
  const [history] = useRecords(user.username, "meeting");
  const recRef = useRef(null);
  const srRef = useRef(null);
  const timerRef = useRef(null);
  const fileRef = useRef(null);
  const live = hasWebSpeech();

  useEffect(() => () => { clearInterval(timerRef.current); recRef.current?.cancel(); try { srRef.current?.stop(); } catch { /* not running */ } }, []);

  const tick = () => { const s = Date.now(); setElapsed(0); timerRef.current = setInterval(() => setElapsed((Date.now() - s) / 1000), 250); };

  const runWhisper = async (blob) => {
    setTranscribing(true); setErr(null);
    try {
      const { samples } = await decodeTo16k(blob);
      const text = await transcribe(samples, lang);
      setTranscript((p) => (p ? `${p}\n${text}` : text));
    } catch (e) { setErr(errText(e, lang)); }
    finally { setTranscribing(false); }
  };

  const start = async () => {
    setErr(null); setSumm(null); setSaved(false);
    if (engine === "live") {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SR();
      rec.continuous = true; rec.interimResults = true; rec.lang = lang === "ar" ? "ar-SA" : "en-US";
      rec.onresult = (e) => {
        let fin = "", tmp = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) fin += e.results[i][0].transcript + " ";
          else tmp += e.results[i][0].transcript;
        }
        if (fin) setTranscript((p) => `${p} ${fin}`.trim());
        setInterim(tmp);
      };
      rec.onerror = (e) => { if (e.error !== "no-speech" && e.error !== "aborted") setErr(`${t.err}${e.error}`); };
      rec.onend = () => { setRecording(false); setInterim(""); clearInterval(timerRef.current); };
      srRef.current = rec;
      try { rec.start(); setRecording(true); tick(); } catch (e) { setErr(errText(e, lang)); }
    } else {
      try {
        recRef.current = await startRecorder();
        setRecording(true); tick();
      } catch (e) { setErr(errText(e, lang)); }
    }
  };

  const stop = async () => {
    clearInterval(timerRef.current);
    setRecording(false);
    if (engine === "live") { try { srRef.current?.stop(); } catch { /* already stopped */ } return; }
    const blob = await recRef.current?.stop();
    recRef.current = null;
    if (blob?.size) runWhisper(blob);
  };

  const summarize = async () => {
    if (!transcript.trim()) return;
    setSummarizing(true); setSumm(null); setStream(""); setErr(null); setSaved(false);
    const ar = lang === "ar";
    try {
      const raw = await generate({
        system: ar ? "أنت محرك دقيق لمحاضر الاجتماعات. لا تخترع ما لم يُذكر." : "You are a precise meeting-notes engine. Never invent anything that wasn't said.",
        prompt: (ar
          ? "لخّص هذا النص المفرّغ بهذا الشكل بالضبط:\nالملخص: فقرة موجزة\nالقرارات:\n- قرار (أو «لا يوجد»)\nبنود العمل:\n- بند مع المسؤول إن ذُكر (أو «لا يوجد»)"
          : "Summarize this transcript in exactly this format:\nSUMMARY: a short paragraph\nDECISIONS:\n- decision (or \"none\")\nACTION ITEMS:\n- item, with the owner if one was named (or \"none\")")
          + `\n\nTRANSCRIPT:\n${transcript.slice(0, 16000)}`,
        maxTokens: 520, temperature: 0.3, onToken: (tok) => setStream((s) => s + tok),
      });
      const parsed = parseMeeting(raw);
      setSumm(parsed);
      await addRecord(user.username, "meeting", { ...parsed, transcript: transcript.slice(0, 20000), words: wordCount(transcript) });
      await logEvent(user.username, "speech", "transcript.summarized", parsed.summary.slice(0, 120));
    } catch (e) { setErr(errText(e, lang)); }
    finally { setSummarizing(false); setStream(""); }
  };

  const saveKb = async () => {
    const body = [summ ? `Summary: ${summ.summary}` : "", summ?.decisions.length ? `Decisions:\n- ${summ.decisions.join("\n- ")}` : "", summ?.actions.length ? `Action items:\n- ${summ.actions.join("\n- ")}` : "", `Transcript:\n${transcript}`].filter(Boolean).join("\n\n");
    await addDoc(user.username, { title: `Meeting — ${new Date().toLocaleDateString()}`, content: body, source: "speech" });
    setSaved(true); toast(t.saved);
  };

  const words = wordCount(transcript);

  return (
    <ModuleShell>
      <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc} />
      <div className="oc-grid-2" style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 14, alignItems: "start" }}>
        <Card>
          <Segmented value={engine} onChange={(v) => !recording && setEngine(v)} options={[
            { value: "whisper", label: t.engine.whisper, icon: ShieldCheck },
            { value: "live", label: t.engine.live, icon: Radio },
          ]} size="sm" />
          <Notice tone={engine === "whisper" ? "success" : "spark"} icon={engine === "whisper" ? ShieldCheck : Radio} style={{ marginTop: 10 }}>
            {engine === "whisper" ? t.whisperNote : live ? t.liveNote : t.noLive}
          </Notice>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            {recording ? (
              <Button onClick={stop} icon={StopCircle} style={{ background: "var(--danger)", color: "#fff" }}>{t.stop} · <span className="oc-mono">{fmtTime(elapsed)}</span></Button>
            ) : (
              <Button onClick={start} icon={Mic} disabled={transcribing || (engine === "live" && !live)}>{t.record}</Button>
            )}
            <Button variant="ghost" icon={Upload} onClick={() => fileRef.current?.click()} disabled={recording || transcribing}>{t.upload}</Button>
            <input ref={fileRef} type="file" accept="audio/*,video/webm,video/mp4" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) runWhisper(f); }} />
            {recording && <span className="oc-pulse-dot" style={{ width: 10, height: 10, borderRadius: 99, background: "var(--danger)" }} />}
          </div>
          {transcribing && <Notice tone="accent" icon={FileAudio} style={{ marginTop: 12 }}>{ai.loadingKey === "asr" && ai.loaded && progressOf(ai) < 1 ? `${t.transcribing} ${Math.round(progressOf(ai) * 100)}%` : t.transcribing}</Notice>}
          <div style={{ marginTop: 14 }}>
            <CardTitle right={words ? <Badge>{words.toLocaleString()} {t.words}</Badge> : null}>{t.transcript}</CardTitle>
            <textarea value={transcript + (interim ? ` ${interim}` : "")} onChange={(e) => setTranscript(e.target.value)} placeholder={t.transcriptPh} rows={9} className="oc-input oc-scroll" />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {summarizing
              ? <Button variant="ghost" icon={Square} onClick={stopGenerating}>{lang === "ar" ? "إيقاف" : "Stop"}</Button>
              : <Button variant="accent" icon={Sparkles} onClick={summarize} disabled={!transcript.trim() || recording}>{t.summarize}</Button>}
            <Button variant="ghost" icon={Download} disabled={!transcript.trim()} onClick={() => download(`transcript-${Date.now()}.txt`, transcript, "text/plain")}>.txt</Button>
            <Button variant="ghost" icon={Trash2} disabled={!transcript} onClick={() => { setTranscript(""); setSumm(null); }}>{lang === "ar" ? "مسح" : "Clear"}</Button>
          </div>
          {err && <Notice tone="danger" style={{ marginTop: 12 }}>{err}</Notice>}
          {(summarizing || summ) && (
            <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
              {summarizing && !summ && (stream ? <div style={{ fontSize: 13.5, color: "var(--ink-soft)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{stream}</div> : <SkeletonLines n={4} />)}
              {summ && <MeetingView m={summ} t={t} lang={lang} />}
              {summ && (
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <Button variant="ghost" icon={saved ? CheckCircle2 : BookMarked} onClick={saveKb} disabled={saved}>{saved ? t.saved : t.save}</Button>
                  <Button variant="ghost" icon={Volume2} onClick={() => speakNow(`${summ.summary} ${summ.actions.join(". ")}`, lang)}>{t.readSummary}</Button>
                </div>
              )}
            </div>
          )}
        </Card>
        <TTSCard t={t} lang={lang} />
      </div>

      <Card style={{ marginTop: 14 }}>
        <CardTitle>{t.history}</CardTitle>
        {history.length === 0 ? <EmptyState icon={History} body={t.noHistory} /> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
            {history.slice(0, 12).map((h) => (
              <button key={h.id} onClick={() => setView(h)} className="oc-press oc-focusable" style={{ textAlign: "start", border: "1px solid var(--border)", borderRadius: 14, padding: 12, background: "var(--surface-2)", cursor: "pointer" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}><Mic size={14} color="var(--accent)" /><span style={{ fontSize: 12, color: "var(--ink-faint)" }}>{timeAgo(h.at, lang)} · {h.words} {t.words}</span></div>
                <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{h.summary}</div>
                {h.actions?.length > 0 && <div style={{ marginTop: 6 }}><Badge tone="accent">{h.actions.length} {t.actions.toLowerCase()}</Badge></div>}
              </button>
            ))}
          </div>
        )}
      </Card>
      <Sheet open={Boolean(view)} onClose={() => setView(null)} title={t.summary}
        footer={<Button variant="danger" size="sm" icon={Trash2} onClick={async () => { await deleteRecord(view.id); setView(null); }}>{lang === "ar" ? "حذف" : "Delete"}</Button>}>
        {view && <><MeetingView m={view} t={t} lang={lang} />
          <details style={{ marginTop: 12 }}><summary style={{ cursor: "pointer", fontWeight: 650, fontSize: 13.5 }}>{t.transcript}</summary>
            <div style={{ fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.6, marginTop: 8, color: "var(--ink-soft)" }}>{view.transcript}</div></details></>}
      </Sheet>
    </ModuleShell>
  );
}

function MeetingView({ m, t }) {
  return (
    <div className="oc-fade-up" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div><div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{t.summary}</div><div style={{ fontSize: 14.5, lineHeight: 1.6 }}><Markdown text={m.summary} /></div></div>
      {m.decisions?.length > 0 && <div><div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{t.decisions}</div><ul style={{ margin: 0, paddingInlineStart: 20, fontSize: 14, lineHeight: 1.7 }}>{m.decisions.map((d, i) => <li key={i}>{d}</li>)}</ul></div>}
      {m.actions?.length > 0 && <div><div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{t.actions}</div><ul style={{ margin: 0, paddingInlineStart: 20, fontSize: 14, lineHeight: 1.7 }}>{m.actions.map((d, i) => <li key={i}>{d}</li>)}</ul></div>}
    </div>
  );
}

function speakNow(text, lang, opts = {}) {
  if (!window.speechSynthesis || !text.trim()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === "ar" ? "ar-SA" : "en-US";
  if (opts.voice) u.voice = opts.voice;
  u.rate = opts.rate || 1; u.pitch = opts.pitch || 1;
  u.onend = opts.onend; u.onerror = opts.onend;
  window.speechSynthesis.speak(u);
}

function TTSCard({ t, lang }) {
  const [text, setText] = useState("");
  const [voices, setVoices] = useState([]);
  const [voiceName, setVoiceName] = useState("");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [state, setState] = useState("idle"); // idle | speaking | paused
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!supported) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => { window.speechSynthesis.removeEventListener?.("voiceschanged", load); window.speechSynthesis.cancel(); };
  }, [supported]);

  const langVoices = voices.filter((v) => v.lang?.toLowerCase().startsWith(lang === "ar" ? "ar" : "en"));
  const list = langVoices.length ? langVoices : voices;
  const voice = list.find((v) => v.name === voiceName) || list.find((v) => v.default) || list[0];

  const speak = () => { setState("speaking"); speakNow(text, lang, { voice, rate, pitch, onend: () => setState("idle") }); };
  const pause = () => { window.speechSynthesis.pause(); setState("paused"); };
  const resume = () => { window.speechSynthesis.resume(); setState("speaking"); };
  const stop = () => { window.speechSynthesis.cancel(); setState("idle"); };

  return (
    <Card>
      <CardTitle>{t.tts}</CardTitle>
      {!supported || !voices.length ? <Notice>{t.noVoices}</Notice> : null}
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t.ttsPh} rows={6} className="oc-input" />
      {list.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginTop: 12 }}>
          <Field label={t.voice}>
            <select className="oc-input" value={voice?.name || ""} onChange={(e) => setVoiceName(e.target.value)}>
              {list.map((v) => <option key={v.name} value={v.name}>{v.name} ({v.lang}){v.localService ? "" : " · online"}</option>)}
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label={`${t.rate} · ${rate.toFixed(1)}×`}><input type="range" min="0.5" max="2" step="0.1" value={rate} onChange={(e) => setRate(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--accent)" }} /></Field>
            <Field label={`${t.pitch} · ${pitch.toFixed(1)}`}><input type="range" min="0.5" max="1.5" step="0.1" value={pitch} onChange={(e) => setPitch(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--accent)" }} /></Field>
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {state === "idle" && <Button icon={Volume2} onClick={speak} disabled={!text.trim() || !supported}>{t.speak}</Button>}
        {state === "speaking" && <Button variant="ghost" icon={Pause} onClick={pause}>{t.pause}</Button>}
        {state === "paused" && <Button variant="ghost" icon={Play} onClick={resume}>{t.resume}</Button>}
        {state !== "idle" && <Button variant="ghost" icon={Square} onClick={stop}>{t.stop}</Button>}
      </div>
    </Card>
  );
}
