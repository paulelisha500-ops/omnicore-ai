import React, { useEffect, useRef, useState } from "react";
import { SunMedium, Moon, Monitor, Cpu, Download, Trash2, Gauge, Upload, HardDrive, Github, ExternalLink, CheckCircle2, AlertTriangle, Mic, Zap, RefreshCw } from "lucide-react";
import { Card, CardTitle, SectionHeader, ModuleShell, Button, Badge, Segmented, Notice, Sheet, ProgressBar, toast } from "../ui.jsx";
import { exportWorkspace, importWorkspace, wipeWorkspace, download, errText } from "../lib/data.js";
import { storageEstimate } from "../lib/db.js";
import { useAI, MODELS, ASR_MODEL, progressOf, sizeOf, loadingName, ensureModel, visionKeyFor, switchModel, clearModelCache, modelCacheSize, generate, detectCapabilities, isModelCached, fmtMB, fmtBytes, getAIState } from "../lib/ai.js";

export const REPO_URL = "https://github.com/paulelisha500-ops/omnicore-ai";
export const SPACE_URL = "https://huggingface.co/spaces/Elisha622/omnicore-ai";

const T = {
  en: {
    title: "Settings", desc: "Appearance, language, the on-device AI engine, and your data.",
    appearance: "Appearance", theme: { system: "System", light: "Light", dark: "Dark" }, language: "Language",
    engine: "AI engine", engineSub: "Models run inside this browser tab. Weights download once from Hugging Face and are cached.",
    textModel: "Text model", textSub: "Answers chat, summaries, agents and every other text task.", visionModel: "Vision model", visionSub: "Reads images and scanned pages. Downloads the first time you analyze an image.",
    same: "The text model also reads images — nothing extra to download.", fastest: "Fastest", loadVision: "Download vision model", speed: "Speed on this device",
    firstToken: "first word after",
    model: "Model", device: "Hardware", webgpu: "WebGPU (graphics card)", cpu: "WebAssembly (CPU)", f16: "fp16 shaders", checking: "Checking…",
    status: "Status", st: { idle: "Not loaded", consent: "Waiting for confirmation", loading: "Loading", ready: "Ready", error: "Error" },
    load: "Download & load", reload: "Load now", bench: "Run speed test", benchRunning: "Testing…", tps: "tokens / second",
    cache: "Cached model files", clearCache: "Clear model cache", cleared: "Model cache cleared", cached: "Downloaded", notCached: "Not downloaded",
    speech: "Speech model", speechSub: `Whisper base (${fmtMB(ASR_MODEL.size.gpu)} with WebGPU, ${fmtMB(ASR_MODEL.size.cpu)} on CPU) — loads the first time you transcribe audio.`,
    data: "Your data", dataSub: "Everything you create is stored in this browser. Export it to back it up or move it to another device.",
    export: "Export workspace", import: "Import workspace", wipe: "Erase workspace", wipeConfirm: "Erase all of your documents, chats, automations, integrations and history on this device? Your account stays.",
    imported: "Imported {n} items", wiped: "Workspace erased", exported: "Export downloaded", storage: "Storage used",
    about: "About", version: "Version", source: "Source code on GitHub", space: "Live app on Hugging Face",
    stack: "React · Vite · Transformers.js (ONNX Runtime Web) · Qwen3 · Qwen3.5 · Whisper · scikit-learn model exported to JSON · IndexedDB",
  },
  ar: {
    title: "الإعدادات", desc: "المظهر واللغة ومحرك الذكاء الاصطناعي على الجهاز وبياناتك.",
    appearance: "المظهر", theme: { system: "النظام", light: "فاتح", dark: "داكن" }, language: "اللغة",
    engine: "محرك الذكاء الاصطناعي", engineSub: "تعمل النماذج داخل هذه الصفحة. تُنزَّل الأوزان مرة واحدة من Hugging Face ثم تُحفَظ.",
    textModel: "نموذج النصوص", textSub: "يجيب في الدردشة والملخصات والوكلاء وكل مهام النصوص.", visionModel: "نموذج الرؤية", visionSub: "يقرأ الصور والصفحات الممسوحة. يُنزَّل أول مرة تحلل فيها صورة.",
    same: "نموذج النصوص يقرأ الصور أيضًا — لا شيء إضافي للتنزيل.", fastest: "الأسرع", loadVision: "تنزيل نموذج الرؤية", speed: "السرعة على هذا الجهاز",
    firstToken: "أول كلمة بعد",
    model: "النموذج", device: "العتاد", webgpu: "WebGPU (بطاقة الرسومات)", cpu: "WebAssembly (المعالج)", f16: "تظليل fp16", checking: "جارٍ الفحص…",
    status: "الحالة", st: { idle: "غير محمَّل", consent: "بانتظار التأكيد", loading: "جارٍ التحميل", ready: "جاهز", error: "خطأ" },
    load: "تنزيل وتحميل", reload: "تحميل الآن", bench: "اختبار السرعة", benchRunning: "جارٍ الاختبار…", tps: "رمز / ثانية",
    cache: "ملفات النماذج المحفوظة", clearCache: "مسح ذاكرة النماذج", cleared: "تم مسح ذاكرة النماذج", cached: "مُنزَّل", notCached: "غير مُنزَّل",
    speech: "نموذج الكلام", speechSub: `Whisper base (${fmtMB(ASR_MODEL.size.gpu)} مع WebGPU، ${fmtMB(ASR_MODEL.size.cpu)} على المعالج) — يُحمَّل أول مرة تفرّغ فيها صوتًا.`,
    data: "بياناتك", dataSub: "كل ما تنشئه محفوظ في هذا المتصفح. صدّره لنسخه احتياطيًا أو نقله إلى جهاز آخر.",
    export: "تصدير مساحة العمل", import: "استيراد مساحة العمل", wipe: "مسح مساحة العمل", wipeConfirm: "مسح كل مستنداتك ومحادثاتك وأتمتتك وتكاملاتك وسجلك على هذا الجهاز؟ يبقى حسابك.",
    imported: "تم استيراد {n} عنصر", wiped: "تم مسح مساحة العمل", exported: "تم تنزيل التصدير", storage: "المساحة المستخدمة",
    about: "حول", version: "الإصدار", source: "الشيفرة المصدرية على GitHub", space: "التطبيق المباشر على Hugging Face",
    stack: "React · Vite · Transformers.js (ONNX Runtime Web) · Qwen3 · Qwen3.5 · Whisper · نموذج scikit-learn مُصدَّر إلى JSON · IndexedDB",
  },
};

export default function Settings({ lang, setLang, theme, setTheme, user }) {
  const t = T[lang];
  const ai = useAI();
  const [caps, setCaps] = useState(ai.caps);
  const [cache, setCache] = useState(null);
  const [bench, setBench] = useState(null);
  const [benching, setBenching] = useState(false);
  const [est, setEst] = useState(null);
  const [wipe, setWipe] = useState(false);
  const [err, setErr] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => { detectCapabilities().then(setCaps).catch(() => setCaps({ webgpu: false })); }, []);
  useEffect(() => { modelCacheSize().then(setCache); storageEstimate().then(setEst); }, [ai.phase, ai.asrReady, ai.loadingKey]);

  const load = async (key) => { setErr(null); try { await ensureModel(key); } catch (e) { if (!e.declined) setErr(errText(e, lang)); } };
  const runBench = async () => {
    setBenching(true); setBench(null); setErr(null);
    try {
      await ensureModel(ai.modelKey);
      await generate({ prompt: "Write three sentences about the ocean.", maxTokens: 64, temperature: 0.7 });
      setBench(getAIState().lastStats);
    } catch (e) { if (!e.declined) setErr(errText(e, lang)); }
    finally { setBenching(false); }
  };

  const doExport = async () => {
    const data = await exportWorkspace(user.username);
    download(`omnicore-${user.username}-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 1));
    toast(t.exported);
  };
  const doImport = async (f) => {
    if (!f) return;
    setErr(null);
    try { const n = await importWorkspace(user.username, JSON.parse(await f.text())); toast(t.imported.replace("{n}", n)); }
    catch (e) { setErr(errText(e, lang)); }
  };

  const busyLoading = Boolean(ai.loadingKey);
  const pct = ai.loaded ? progressOf(ai) : null;
  const vKey = visionKeyFor(ai.modelKey);
  const status = (k) => ai.models[k] || "idle";

  return (
    <ModuleShell>
      <SectionHeader title={t.title} description={t.desc} />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Card>
          <CardTitle>{t.appearance}</CardTitle>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
            <Segmented value={theme} onChange={setTheme} options={[
              { value: "system", label: t.theme.system, icon: Monitor }, { value: "light", label: t.theme.light, icon: SunMedium }, { value: "dark", label: t.theme.dark, icon: Moon },
            ]} />
            <Segmented value={lang} onChange={setLang} options={[{ value: "en", label: "English" }, { value: "ar", label: "العربية" }]} />
          </div>
        </Card>

        <Card>
          <CardTitle sub={t.engineSub}>{t.engine}</CardTitle>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>{t.textModel}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 10 }}>{t.textSub}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
            {Object.entries(MODELS).map(([key, m]) => {
              const active = ai.modelKey === key;
              const st = status(key);
              return (
                <button key={key} onClick={() => switchModel(key)} disabled={ai.busy > 0} className="oc-press oc-focusable" aria-pressed={active}
                  style={{ textAlign: "start", border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`, background: active ? "var(--accent-soft)" : "var(--surface-2)", borderRadius: 16, padding: 14, cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 14.5, display: "inline-flex", gap: 6, alignItems: "center" }}>{m.name} {key === "qwen3-0.6b" && <Badge tone="spark" icon={Zap}>{t.fastest}</Badge>}</span>
                    <Badge tone={st === "ready" ? "success" : st === "error" ? "danger" : isModelCached(key) ? "accent" : "neutral"}>
                      {st === "ready" ? t.st.ready : st === "loading" ? t.st.loading : isModelCached(key) ? t.cached : fmtMB(sizeOf(key, caps))}
                    </Badge>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 6, lineHeight: 1.5 }}>{m[lang]}</div>
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12, background: "var(--surface-sunken)", borderRadius: 14, padding: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.visionModel}: {MODELS[vKey].name}</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginTop: 3, lineHeight: 1.45 }}>{vKey === ai.modelKey ? t.same : t.visionSub}</div>
            </div>
            <Badge tone={status(vKey) === "ready" ? "success" : isModelCached(vKey) ? "accent" : "neutral"}>
              {status(vKey) === "ready" ? t.st.ready : status(vKey) === "loading" ? t.st.loading : isModelCached(vKey) ? t.cached : fmtMB(sizeOf(vKey, caps))}
            </Badge>
            {vKey !== ai.modelKey && status(vKey) !== "ready" && <Button size="sm" variant="ghost" icon={Download} onClick={() => load(vKey)} disabled={busyLoading}>{t.loadVision}</Button>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginTop: 14 }}>
            <Info label={t.device} value={caps == null ? t.checking : caps.webgpu ? t.webgpu : t.cpu} extra={caps?.webgpu ? `${caps.f16 ? t.f16 + " ✓" : ""} ${caps.adapter || ""}`.trim() : ""} icon={caps?.webgpu ? Zap : Cpu} />
            <Info label={t.status} value={ai.phase === "ready" ? `${t.st.ready} · ${ai.device === "webgpu" ? "WebGPU" : "CPU"}` : t.st[ai.phase]} icon={ai.phase === "ready" ? CheckCircle2 : ai.phase === "error" ? AlertTriangle : Cpu} />
            <Info label={t.cache} value={cache ? fmtBytes(cache.bytes) : "—"} extra={cache ? `${cache.files} files` : ""} icon={HardDrive} />
          </div>
          {busyLoading && <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12.5, fontWeight: 650, marginBottom: 6 }}>{loadingName(ai)}</div>
            <ProgressBar value={pct} />
            <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 6 }}>{ai.loaded ? `${fmtBytes(ai.loaded)} / ${fmtBytes(Math.max(ai.total, sizeOf(ai.loadingKey, caps) * 1e6))}` : "…"}</div>
          </div>}
          {est?.quota > 0 && est.quota < 2.5e9 && (
            <Notice tone="spark" icon={AlertTriangle} style={{ marginTop: 12 }}>
              {lang === "ar"
                ? `يسمح هذا المتصفح لهذا الموقع بـ ${fmtBytes(est.quota)} فقط من التخزين، لذا قد يُعاد تنزيل النموذج في كل زيارة. أفرغ مساحة على القرص أو استخدم نافذة متصفح عادية.`
                : `This browser only allows ${fmtBytes(est.quota)} of storage for this site, so models may re-download on each visit. Free up disk space or use a regular (non-private) browser window.`}
            </Notice>
          )}
          {ai.error && <Notice tone="danger" style={{ marginTop: 12 }}>{ai.error}</Notice>}
          {ai.notice && <Notice tone="spark" style={{ marginTop: 12 }}>{ai.notice}</Notice>}
          {err && <Notice tone="danger" style={{ marginTop: 12 }}>{err}</Notice>}
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
            {status(ai.modelKey) !== "ready" && <Button variant="accent" icon={Download} onClick={() => load(ai.modelKey)} loading={ai.loadingKey === ai.modelKey}>{isModelCached(ai.modelKey) ? t.reload : t.load}</Button>}
            <Button variant="ghost" icon={Gauge} onClick={runBench} loading={benching} disabled={busyLoading}>{benching ? t.benchRunning : t.bench}</Button>
            <Button variant="danger" icon={Trash2} onClick={async () => { await clearModelCache(); setCache(await modelCacheSize()); toast(t.cleared); }} disabled={busyLoading || ai.busy > 0}>{t.clearCache}</Button>
          </div>
          {bench?.tps > 0 && (
            <Notice tone="success" icon={Gauge} style={{ marginTop: 12 }}>
              <strong>{t.speed}:</strong> {bench.tps.toFixed(1)} {t.tps} · {bench.device === "webgpu" ? "WebGPU" : "CPU"}
              {bench.firstTokenMs ? ` · ${t.firstToken} ${(bench.firstTokenMs / 1000).toFixed(1)}s` : ""}
            </Notice>
          )}
        </Card>

        <Card>
          <CardTitle sub={t.speechSub} right={<Badge tone={ai.asrReady || localStorage.getItem("omnicore_asr_cached") ? "success" : "neutral"} icon={Mic}>{ai.asrReady || localStorage.getItem("omnicore_asr_cached") ? t.cached : t.notCached}</Badge>}>{t.speech}</CardTitle>
        </Card>

        <Card>
          <CardTitle sub={t.dataSub} right={est ? <Badge icon={HardDrive}>{t.storage}: {fmtBytes(est.usage)}</Badge> : null}>{t.data}</CardTitle>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button variant="ghost" icon={Download} onClick={doExport}>{t.export}</Button>
            <Button variant="ghost" icon={Upload} onClick={() => fileRef.current?.click()}>{t.import}</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { doImport(e.target.files?.[0]); e.target.value = ""; }} />
            <Button variant="danger" icon={Trash2} onClick={() => setWipe(true)}>{t.wipe}</Button>
          </div>
        </Card>

        <Card>
          <CardTitle>{t.about}</CardTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13.5 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--ink-soft)" }}>{t.version}</span><span className="oc-mono">{__APP_VERSION__}</span></div>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--accent)", textDecoration: "none", fontWeight: 650 }}><Github size={15} /> {t.source} <ExternalLink size={12} /></a>
            <a href={SPACE_URL} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--accent)", textDecoration: "none", fontWeight: 650 }}><RefreshCw size={15} /> {t.space} <ExternalLink size={12} /></a>
            <div style={{ fontSize: 12, color: "var(--ink-faint)", lineHeight: 1.6, marginTop: 4 }}>{t.stack}</div>
          </div>
        </Card>
      </div>
      <Sheet open={wipe} onClose={() => setWipe(false)} title={t.wipe}
        footer={<><Button variant="ghost" onClick={() => setWipe(false)}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button><Button variant="danger" icon={Trash2} onClick={async () => { await wipeWorkspace(user.username); setWipe(false); toast(t.wiped); }}>{t.wipe}</Button></>}>
        <div style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55 }}>{t.wipeConfirm}</div>
      </Sheet>
    </ModuleShell>
  );
}

function Info({ label, value, extra, icon: I }) {
  return (
    <div style={{ background: "var(--surface-sunken)", borderRadius: 12, padding: "10px 12px", display: "flex", gap: 10, alignItems: "flex-start" }}>
      <I size={16} color="var(--accent)" style={{ marginTop: 2, flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11.5, color: "var(--ink-faint)", fontWeight: 650 }}>{label}</div>
        <div style={{ fontSize: 13.5, fontWeight: 650, marginTop: 2 }}>{value}</div>
        {extra && <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis" }}>{extra}</div>}
      </div>
    </div>
  );
}
