import React, { useEffect, useMemo, useRef, useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import { TrendingUp, AlertTriangle, CheckCircle2, Upload, Download, Database, Save, Trash2, ChevronDown, ChevronUp, Target, FileSpreadsheet, Sparkles, ArrowDownRight } from "lucide-react";
import { Card, CardTitle, SectionHeader, ModuleShell, Button, Badge, Notice, Segmented, Field, EmptyState, ProgressBar, useChartColors, tooltipStyle, toast } from "../ui.jsx";
import { addRecord, deleteRecord, useRecords, logEvent, errText, timeAgo, download } from "../lib/data.js";
import { loadModel, predictWith, FIELDS, DEFAULT_ROW, THRESHOLD, METRICS, CONFUSION, ROC, IMPORTANCE, parseCSV, toCSV, SAMPLE_CSV_URL } from "../lib/churn.js";
import { commonText } from "../i18n.js";

const T = {
  en: {
    eyebrow: "Module 06", title: "Predictive Analytics",
    desc: "A real Random Forest churn model trained on the IBM Telco dataset (7,043 real customers) — exported from scikit-learn and running right here in your browser, with results identical to the original.",
    badge: "Real model · runs in your browser", tabs: { predict: "Predict", batch: "Score a file", model: "Model" },
    prob: "Churn probability", likely: "Likely to churn", stay: "Likely to stay", threshold: "Decision threshold",
    allFields: "All 19 fields", fewer: "Key fields only", save: "Save prediction", saved: "Prediction saved",
    lower: "What would lower the risk", lowerSub: "Each change applied alone, re-scored by the model", noLower: "This customer is already at low risk.",
    savedTitle: "Saved predictions", noSaved: "Predictions you save appear here.",
    upload: "Upload customer CSV", sample: "Load IBM Telco dataset (7,043 customers)", scoring: "Scoring customers", loadingSample: "Downloading dataset…",
    batchHint: "Use the IBM Telco column names (tenure, Contract, InternetService, …). Missing columns fall back to defaults. Everything is scored locally.",
    customers: "Customers", highRisk: "High risk", avg: "Average probability", dist: "Risk distribution", top: "Highest-risk customers", downloadCsv: "Download scored CSV",
    evalTitle: "Accuracy on this file's own labels", evalNote: "This file includes a Churn column, so OmniCore compared its predictions with the real outcomes.",
    trainNote: "Note: the IBM dataset includes the rows the model was trained on, so these numbers are optimistic. The honest, held-out figures are on the Model tab.",
    missing: "Missing columns (defaults used)",
    metrics: { accuracy: "Accuracy", precision: "Precision", recall: "Recall", f1: "F1 score", auc: "ROC-AUC" },
    why: "Why not just accuracy?", whyBody: "Only 26.5% of customers in this dataset churn. A model that always says \"no churn\" scores 73.5% accuracy while catching nobody. That's why this model was selected on F1 and recall, and its threshold tuned to 0.60 on a validation split.",
    confusion: "Confusion matrix", confusionSub: "1,409 held-out customers never seen in training", roc: "ROC curve", rocSub: "True-positive vs false-positive rate",
    drivers: "Top churn drivers", driversSub: "Feature importance from the trained forest",
    card: "Model card", cardBody: "Random Forest (400 trees, depth ≤ 8) chosen over Logistic Regression and XGBoost by 5-fold cross-validated F1. Trained on 5,634 customers, evaluated once on 1,409 never seen during training or tuning. Exported with ml/export_churn_model.py and verified against scikit-learn to within 0.000001.",
    labels: ["No churn", "Churn"], predicted: "Predicted", actual: "Actual",
  },
  ar: {
    eyebrow: "الوحدة 06", title: "التحليلات التنبؤية",
    desc: "نموذج غابة عشوائية حقيقي للتنبؤ بتسرّب العملاء مدرّب على بيانات IBM Telco (7,043 عميلًا حقيقيًا) — مُصدَّر من scikit-learn ويعمل هنا في متصفحك بنتائج مطابقة للأصل.",
    badge: "نموذج حقيقي · يعمل في متصفحك", tabs: { predict: "تنبؤ", batch: "تقييم ملف", model: "النموذج" },
    prob: "احتمالية التسرّب", likely: "مرجّح أن يتسرّب", stay: "مرجّح أن يبقى", threshold: "عتبة القرار",
    allFields: "كل الحقول الـ19", fewer: "الحقول الرئيسية فقط", save: "حفظ التنبؤ", saved: "تم حفظ التنبؤ",
    lower: "ما الذي يخفض الخطر", lowerSub: "كل تغيير على حدة، مع إعادة التقييم بالنموذج", noLower: "هذا العميل منخفض الخطر بالفعل.",
    savedTitle: "التنبؤات المحفوظة", noSaved: "تظهر هنا التنبؤات التي تحفظها.",
    upload: "رفع ملف عملاء CSV", sample: "تحميل بيانات IBM Telco (7,043 عميلًا)", scoring: "جارٍ تقييم العملاء", loadingSample: "جارٍ تنزيل البيانات…",
    batchHint: "استخدم أسماء أعمدة IBM Telco (tenure وContract وInternetService…). الأعمدة الناقصة تأخذ قيمًا افتراضية. يتم التقييم محليًا بالكامل.",
    customers: "العملاء", highRisk: "عالي الخطورة", avg: "متوسط الاحتمالية", dist: "توزيع الخطر", top: "العملاء الأعلى خطورة", downloadCsv: "تنزيل CSV المقيَّم",
    evalTitle: "الدقة على تسميات هذا الملف", evalNote: "يحتوي الملف على عمود Churn، لذا قارن أومنيكور تنبؤاته بالنتائج الفعلية.",
    trainNote: "ملاحظة: بيانات IBM تتضمن الصفوف التي دُرِّب عليها النموذج، لذا هذه الأرقام متفائلة. الأرقام الصادقة على بيانات محجوبة موجودة في تبويب «النموذج».",
    missing: "أعمدة ناقصة (استُخدمت القيم الافتراضية)",
    metrics: { accuracy: "الدقة", precision: "الدقة الموجبة", recall: "الاستدعاء", f1: "درجة F1", auc: "ROC-AUC" },
    why: "لماذا لا نكتفي بالدقة؟", whyBody: "26.5% فقط من العملاء في هذه البيانات يتسربون. نموذج يقول دائمًا «لا تسرّب» يحقق دقة 73.5% دون رصد أحد. لذلك اختير النموذج على F1 والاستدعاء، وضُبطت عتبته على 0.60 باستخدام بيانات تحقق منفصلة.",
    confusion: "مصفوفة الالتباس", confusionSub: "1,409 عميلًا محجوبًا لم يرهم النموذج", roc: "منحنى ROC", rocSub: "معدل الإيجابيات الصحيحة مقابل الخاطئة",
    drivers: "أهم مسببات التسرّب", driversSub: "أهمية الخصائص من الغابة المدرّبة",
    card: "بطاقة النموذج", cardBody: "غابة عشوائية (400 شجرة، عمق ≤ 8) اختيرت على الانحدار اللوجستي وXGBoost عبر F1 بالتحقق المتقاطع الخماسي. دُرِّبت على 5,634 عميلًا وقُيِّمت مرة واحدة على 1,409 لم تُرَ أثناء التدريب أو الضبط. صُدِّرت عبر ml/export_churn_model.py وتطابقت مع scikit-learn ضمن 0.000001.",
    labels: ["لا تسرّب", "تسرّب"], predicted: "المتوقَّع", actual: "الفعلي",
  },
};

const pct = (p) => `${(p * 100).toFixed(1)}%`;

function useModel() {
  const [m, setM] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { loadModel().then(setM).catch((e) => setErr(e.message)); }, []);
  return [m, err];
}

export default function Analytics({ lang, user }) {
  const t = T[lang];
  const [tab, setTab] = useState("predict");
  const [model, modelErr] = useModel();
  return (
    <ModuleShell>
      <SectionHeader eyebrow={t.eyebrow} title={t.title} description={t.desc} action={<Badge tone="success" icon={CheckCircle2}>{t.badge}</Badge>} />
      <div style={{ marginBottom: 16 }}>
        <Segmented value={tab} onChange={setTab} options={[
          { value: "predict", label: t.tabs.predict, icon: Target },
          { value: "batch", label: t.tabs.batch, icon: FileSpreadsheet },
          { value: "model", label: t.tabs.model, icon: TrendingUp },
        ]} />
      </div>
      {modelErr && <Notice tone="danger">{modelErr}</Notice>}
      {tab === "predict" && <Predict t={t} lang={lang} user={user} model={model} />}
      {tab === "batch" && <Batch t={t} lang={lang} user={user} model={model} />}
      {tab === "model" && <ModelTab t={t} lang={lang} />}
    </ModuleShell>
  );
}

/* ------------------------------------------------------------------------ */
function Predict({ t, lang, user, model }) {
  const [row, setRow] = useState(DEFAULT_ROW);
  const [all, setAll] = useState(false);
  const [saved] = useRecords(user.username, "prediction");
  const res = useMemo(() => (model ? predictWith(model, row) : null), [model, row]);

  // Counterfactuals: re-score with one field changed to each alternative value.
  const levers = useMemo(() => {
    if (!model || !res) return [];
    const out = [];
    for (const f of FIELDS) {
      if (f.type === "number") {
        if (f.key === "tenure") {
          const v = Math.min(f.max, Number(row.tenure) + 24);
          if (v !== Number(row.tenure)) out.push({ f, v, p: predictWith(model, { ...row, tenure: v, TotalCharges: Number(row.TotalCharges) + 24 * Number(row.MonthlyCharges) }).churn_probability, label: `+24 ${lang === "ar" ? "شهرًا" : "months tenure"}` });
        }
        continue;
      }
      // Only suggest changes a real customer could make: never "remove the
      // service" levers, and keep add-ons consistent with the base service.
      if (["InternetService", "PhoneService", "gender", "SeniorCitizen", "Partner", "Dependents"].includes(f.key)) continue;
      for (const v of f.options) {
        if (v === row[f.key]) continue;
        if (v === "No internet service" || v === "No phone service") continue;
        if (row.InternetService === "No" && f.options.includes("No internet service")) continue;
        if (row.PhoneService === "No" && f.key === "MultipleLines") continue;
        const p = predictWith(model, { ...row, [f.key]: v }).churn_probability;
        out.push({ f, v, p });
      }
    }
    return out.filter((x) => x.p < res.churn_probability - 0.01).sort((a, b) => a.p - b.p)
      .filter((x, i, arr) => arr.findIndex((y) => y.f.key === x.f.key) === i).slice(0, 5);
  }, [model, row, res, lang]);

  // Keep dependent fields valid, exactly as they appear in the dataset: no
  // internet service means every internet add-on is "No internet service".
  const INTERNET_ADDONS = ["OnlineSecurity", "OnlineBackup", "DeviceProtection", "TechSupport", "StreamingTV", "StreamingMovies"];
  // Numbers are held to the field's range: a tenure of -5 or charges of 1e9
  // aren't customers, and the model would still score them confidently.
  const clamp = (f, n) => (Number.isFinite(n) ? Math.min(f.max, Math.max(f.min, n)) : f.def);
  const set = (f) => (e) => setRow((r) => {
    const v = f.type === "number" ? clamp(f, Number(e.target.value)) : f.key === "SeniorCitizen" ? Number(e.target.value) : e.target.value;
    const next = { ...r, [f.key]: v };
    if (f.key === "InternetService") {
      for (const k of INTERNET_ADDONS) {
        if (v === "No") next[k] = "No internet service";
        else if (next[k] === "No internet service") next[k] = "No";
      }
    }
    if (f.key === "PhoneService") next.MultipleLines = v === "No" ? "No phone service" : (next.MultipleLines === "No phone service" ? "No" : next.MultipleLines);
    if (INTERNET_ADDONS.includes(f.key) && v === "No internet service") next.InternetService = "No";
    if (INTERNET_ADDONS.includes(f.key) && v !== "No internet service" && next.InternetService === "No") next.InternetService = "DSL";
    return next;
  });

  const save = async () => {
    const r = await addRecord(user.username, "prediction", { row, probability: res.churn_probability, willChurn: res.will_churn });
    await logEvent(user.username, "analytics", res.will_churn ? "prediction.high_risk" : "prediction.saved", `${pct(res.churn_probability)} churn risk (${row.Contract}, ${row.tenure} months)`, { recordId: r.id });
    toast(t.saved);
  };

  const fields = all ? FIELDS : FIELDS.filter((f) => f.core);
  const p = res?.churn_probability ?? 0;
  const high = res?.will_churn;

  return (
    <>
      <div className="oc-grid-2" style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 14, alignItems: "start" }}>
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
            {fields.map((f) => (
              <Field key={f.key} label={f[lang]}>
                {f.type === "number"
                  ? <input type="number" className="oc-input" min={f.min} max={f.max} step={f.step} value={row[f.key]} onChange={set(f)} />
                  : <select className="oc-input" value={row[f.key]} onChange={set(f)}>
                      {f.options.map((o, i) => <option key={String(o)} value={o}>{f.labels ? f.labels[lang][i] : o}</option>)}
                    </select>}
              </Field>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <Button variant="ghost" size="sm" icon={all ? ChevronUp : ChevronDown} onClick={() => setAll((v) => !v)}>{all ? t.fewer : t.allFields}</Button>
            <Button variant="ghost" size="sm" onClick={() => setRow(DEFAULT_ROW)}>{lang === "ar" ? "إعادة تعيين" : "Reset"}</Button>
          </div>
        </Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card style={{ background: high ? "var(--danger-soft)" : "var(--success-soft)", borderColor: "transparent" }}>
            <div style={{ fontSize: 13, fontWeight: 650, color: "var(--ink-soft)" }}>{t.prob}</div>
            <div className="oc-mono" style={{ fontSize: 46, fontWeight: 700, lineHeight: 1.1, marginTop: 6, color: high ? "var(--danger)" : "var(--success)", transition: "color .3s" }}>
              {res ? pct(p) : "—"}
            </div>
            <div style={{ marginTop: 12, position: "relative" }}>
              <div style={{ height: 10, borderRadius: 99, background: "linear-gradient(90deg, var(--success), #D9A21F, var(--danger))", opacity: 0.35 }} />
              <div style={{ position: "absolute", top: -3, insetInlineStart: `calc(${p * 100}% - 8px)`, width: 16, height: 16, borderRadius: 99, background: "var(--surface)", border: `3px solid ${high ? "var(--danger)" : "var(--success)"}`, transition: "inset-inline-start .35s var(--ease)" }} />
              <div style={{ position: "absolute", top: -5, insetInlineStart: `${THRESHOLD * 100}%`, width: 2, height: 20, background: "var(--ink-faint)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 8 }}>
              <Badge tone={high ? "danger" : "success"} icon={high ? AlertTriangle : CheckCircle2}>{high ? t.likely : t.stay}</Badge>
              <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{t.threshold}: {THRESHOLD.toFixed(2)}</span>
            </div>
            <div style={{ marginTop: 14 }}><Button icon={Save} onClick={save} disabled={!res}>{t.save}</Button></div>
          </Card>
          <Card>
            <CardTitle sub={t.lowerSub}>{t.lower}</CardTitle>
            {levers.length === 0 ? <div style={{ fontSize: 13, color: "var(--ink-faint)" }}>{t.noLower}</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {levers.map((l) => (
                  <button key={l.f.key} onClick={() => setRow((r) => ({ ...r, [l.f.key]: l.v, ...(l.f.key === "tenure" ? { TotalCharges: Number(r.TotalCharges) + 24 * Number(r.MonthlyCharges) } : {}) }))}
                    className="oc-press oc-focusable oc-row-hover" style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--border)", background: "var(--surface-2)", borderRadius: 12, padding: "9px 11px", cursor: "pointer", textAlign: "start" }}>
                    <ArrowDownRight size={16} color="var(--success)" className="oc-flip" />
                    <span style={{ flex: 1, fontSize: 13.5 }}>{l.label || `${l.f[lang]} → ${l.f.labels ? l.f.labels[lang][l.f.options.indexOf(l.v)] : l.v}`}</span>
                    <span className="oc-mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--success)" }}>{pct(l.p)}</span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
      <Card style={{ marginTop: 14 }}>
        <CardTitle>{t.savedTitle}</CardTitle>
        {saved.length === 0 ? <EmptyState icon={Target} body={t.noSaved} /> : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {saved.slice(0, 15).map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                <Badge tone={s.willChurn ? "danger" : "success"}>{pct(s.probability)}</Badge>
                <span style={{ flex: 1, minWidth: 0, color: "var(--ink-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.row.Contract} · {s.row.tenure} mo · {s.row.InternetService} · ${s.row.MonthlyCharges}/mo
                </span>
                <span style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{timeAgo(s.at, lang)}</span>
                <Button size="sm" variant="link" onClick={() => setRow({ ...DEFAULT_ROW, ...s.row })}>{lang === "ar" ? "فتح" : "Load"}</Button>
                <button onClick={() => deleteRecord(s.id)} aria-label={commonText[lang].delete} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ink-faint)" }}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------------ */
function auc(labels, probs) {
  const idx = probs.map((p, i) => [p, labels[i]]).sort((a, b) => a[0] - b[0]);
  let rankSum = 0, pos = 0;
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j < idx.length && idx[j][0] === idx[i][0]) j++;
    const avgRank = (i + j + 1) / 2;
    for (let k = i; k < j; k++) if (idx[k][1]) { rankSum += avgRank; pos++; }
    i = j;
  }
  const neg = idx.length - pos;
  return pos && neg ? (rankSum - (pos * (pos + 1)) / 2) / (pos * neg) : null;
}

function Batch({ t, lang, user, model }) {
  const c = useChartColors();
  const fileRef = useRef(null);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [out, setOut] = useState(null);
  const [err, setErr] = useState(null);

  const score = async (text, name, isSample) => {
    setErr(null); setOut(null);
    try {
      const m = model || await loadModel();
      const { header, records } = parseCSV(text);
      if (!records.length) throw new Error(lang === "ar" ? "الملف فارغ." : "The file has no rows.");
      const missing = FIELDS.map((f) => f.key).filter((k) => !header.includes(k));
      setStatus(t.scoring);
      const scored = [];
      for (let i = 0; i < records.length; i += 400) {
        for (const r of records.slice(i, i + 400)) {
          const row = { ...DEFAULT_ROW };
          for (const f of FIELDS) {
            if (!(f.key in r) || r[f.key] === "") continue;
            const n = Number(r[f.key]);
            row[f.key] = f.type === "number" || f.key === "SeniorCitizen" ? (Number.isFinite(n) ? n : f.def) : r[f.key];
          }
          const p = predictWith(m, row).churn_probability;
          scored.push({ ...r, churn_probability: Math.round(p * 10000) / 10000, churn_prediction: p >= THRESHOLD ? "Yes" : "No" });
        }
        setProgress(Math.min(1, (i + 400) / records.length));
        await new Promise((r) => setTimeout(r, 0)); // yield so the UI stays smooth
      }
      const probs = scored.map((s) => s.churn_probability);
      const high = scored.filter((s) => s.churn_prediction === "Yes");
      const hist = Array.from({ length: 10 }, (_, i) => ({ bin: `${i * 10}–${i * 10 + 10}%`, n: 0, hi: (i + 1) / 10 > THRESHOLD }));
      for (const p of probs) hist[Math.min(9, Math.floor(p * 10))].n++;
      let evaluation = null;
      if (header.includes("Churn")) {
        const labels = scored.map((s) => /^(yes|1|true)$/i.test(String(s.Churn).trim()) ? 1 : 0);
        let tp = 0, fp = 0, tn = 0, fn = 0;
        scored.forEach((s, i) => { const pr = s.churn_prediction === "Yes" ? 1 : 0; if (pr && labels[i]) tp++; else if (pr) fp++; else if (labels[i]) fn++; else tn++; });
        const precision = tp / (tp + fp || 1), recall = tp / (tp + fn || 1);
        evaluation = { tp, fp, tn, fn, accuracy: (tp + tn) / scored.length, precision, recall, f1: (2 * precision * recall) / (precision + recall || 1), auc: auc(labels, probs) };
      }
      const idKey = header.find((h) => /customer.?id|^id$/i.test(h));
      const top = [...scored].sort((a, b) => b.churn_probability - a.churn_probability).slice(0, 25);
      const result = { name, header, scored, missing, hist, evaluation, idKey, top, isSample,
        avg: probs.reduce((s, p) => s + p, 0) / probs.length, highCount: high.length };
      setOut(result);
      await addRecord(user.username, "batch", { name, rows: scored.length, highRisk: high.length, avg: result.avg,
        top: top.slice(0, 10).map((r) => ({ id: idKey ? r[idKey] : "", p: r.churn_probability, contract: r.Contract, tenure: r.tenure })) });
      await logEvent(user.username, "analytics", "batch.scored", `${name}: ${high.length} of ${scored.length} high-risk`);
    } catch (e) { setErr(errText(e, lang)); }
    finally { setStatus(null); setProgress(0); }
  };

  const loadSample = async () => {
    setStatus(t.loadingSample); setErr(null);
    try {
      const r = await fetch(SAMPLE_CSV_URL);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await score(await r.text(), "IBM Telco Customer Churn", true);
    } catch (e) { setErr(errText(e, lang)); setStatus(null); }
  };

  const idLabel = (r, i) => (out.idKey ? r[out.idKey] : `#${i + 1}`);

  return (
    <>
      <Card>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button icon={Upload} onClick={() => fileRef.current?.click()} disabled={Boolean(status)}>{t.upload}</Button>
          <Button variant="ghost" icon={Database} onClick={loadSample} disabled={Boolean(status)}>{t.sample}</Button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) score(await f.text(), f.name, false); }} />
        </div>
        <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginTop: 10, lineHeight: 1.5 }}>{t.batchHint}</div>
        {status && <div style={{ marginTop: 12 }}><div style={{ fontSize: 13, marginBottom: 6 }}>{status}… {progress ? `${Math.round(progress * 100)}%` : ""}</div><ProgressBar value={progress || null} /></div>}
        {err && <Notice tone="danger" style={{ marginTop: 12 }}>{err}</Notice>}
      </Card>
      {out && (
        <div className="oc-fade-up" style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
          {out.missing.length > 0 && <Notice tone="spark" icon={AlertTriangle}>{t.missing}: {out.missing.join(", ")}</Notice>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <Card><div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{t.customers}</div><div className="oc-mono" style={{ fontSize: 28, fontWeight: 700 }}>{out.scored.length.toLocaleString()}</div></Card>
            <Card><div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{t.highRisk}</div><div className="oc-mono" style={{ fontSize: 28, fontWeight: 700, color: "var(--danger)" }}>{out.highCount.toLocaleString()} <span style={{ fontSize: 14, color: "var(--ink-faint)" }}>{pct(out.highCount / out.scored.length)}</span></div></Card>
            <Card><div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{t.avg}</div><div className="oc-mono" style={{ fontSize: 28, fontWeight: 700 }}>{pct(out.avg)}</div></Card>
          </div>
          <div className="oc-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Card>
              <CardTitle>{t.dist}</CardTitle>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={out.hist} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke={c.grid} vertical={false} />
                  <XAxis dataKey="bin" tick={{ fontSize: 10, fill: c.tick }} axisLine={false} tickLine={false} interval={1} />
                  <YAxis tick={{ fontSize: 10, fill: c.tick }} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle(c)} />
                  <Bar dataKey="n" radius={[6, 6, 0, 0]}>{out.hist.map((h, i) => <Cell key={i} fill={h.hi ? c.danger : c.accent} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            {out.evaluation ? (
              <Card>
                <CardTitle sub={t.evalNote}>{t.evalTitle}</CardTitle>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 8 }}>
                  {[["accuracy", out.evaluation.accuracy], ["precision", out.evaluation.precision], ["recall", out.evaluation.recall], ["f1", out.evaluation.f1], ["auc", out.evaluation.auc]].map(([k, v]) => (
                    <div key={k} style={{ background: "var(--surface-sunken)", borderRadius: 12, padding: 10 }}>
                      <div className="oc-mono" style={{ fontSize: 18, fontWeight: 700 }}>{v == null ? "—" : pct(v)}</div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{t.metrics[k]}</div>
                    </div>
                  ))}
                </div>
                {out.isSample && <Notice tone="spark" style={{ marginTop: 10 }}>{t.trainNote}</Notice>}
              </Card>
            ) : (
              <Card>
                <CardTitle>{t.downloadCsv}</CardTitle>
                <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 12 }}>{lang === "ar" ? "يضيف عمودي churn_probability وchurn_prediction إلى ملفك." : "Adds churn_probability and churn_prediction columns to your file."}</div>
                <Button icon={Download} onClick={() => download(`scored-${out.name.replace(/\W+/g, "_")}.csv`, toCSV(out.scored, [...out.header, "churn_probability", "churn_prediction"]), "text/csv")}>{t.downloadCsv}</Button>
              </Card>
            )}
          </div>
          <Card>
            <CardTitle right={<Button size="sm" variant="ghost" icon={Download} onClick={() => download(`scored-${out.name.replace(/\W+/g, "_")}.csv`, toCSV(out.scored, [...out.header, "churn_probability", "churn_prediction"]), "text/csv")}>CSV</Button>}>{t.top}</CardTitle>
            <div className="oc-scroll" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
                <thead><tr style={{ color: "var(--ink-faint)", textAlign: "start" }}>
                  {["ID", "Contract", "tenure", "InternetService", "MonthlyCharges", t.prob].map((h) => <th key={h} style={{ textAlign: "start", padding: "6px 8px", fontWeight: 650, borderBottom: "1px solid var(--border)" }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {out.top.map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="oc-mono" style={{ padding: "7px 8px" }}>{idLabel(r, i)}</td>
                      <td style={{ padding: "7px 8px" }}>{r.Contract ?? "—"}</td>
                      <td style={{ padding: "7px 8px" }}>{r.tenure ?? "—"}</td>
                      <td style={{ padding: "7px 8px" }}>{r.InternetService ?? "—"}</td>
                      <td style={{ padding: "7px 8px" }}>{r.MonthlyCharges ?? "—"}</td>
                      <td style={{ padding: "7px 8px" }}><Badge tone="danger">{pct(r.churn_probability)}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------------ */
function ModelTab({ t, lang }) {
  const c = useChartColors();
  const list = [["accuracy", METRICS.accuracy], ["precision", METRICS.precision], ["recall", METRICS.recall], ["f1", METRICS.f1], ["auc", METRICS.roc_auc]];
  const cell = (v, good) => (
    <div className="oc-mono" style={{ background: good ? "var(--success-soft)" : "var(--danger-soft)", color: good ? "var(--success)" : "var(--danger)", textAlign: "center", padding: "16px 0", borderRadius: 12, fontWeight: 700, fontSize: 16 }}>{v}</div>
  );
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 14 }}>
        {list.map(([k, v]) => (
          <Card key={k}><div className="oc-mono" style={{ fontSize: 26, fontWeight: 700 }}>{(v * 100).toFixed(1)}<span style={{ fontSize: 14, color: "var(--ink-faint)" }}>%</span></div><div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 4 }}>{t.metrics[k]}</div></Card>
        ))}
      </div>
      <Notice tone="spark" icon={AlertTriangle} style={{ marginBottom: 14 }}><strong>{t.why}</strong> {t.whyBody}</Notice>
      <div className="oc-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card>
          <CardTitle sub={t.confusionSub}>{t.confusion}</CardTitle>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: 8, fontSize: 12.5, alignItems: "center" }}>
            <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{t.actual} ↓ / {t.predicted} →</div>
            <div style={{ textAlign: "center", fontWeight: 650, color: "var(--ink-faint)" }}>{t.labels[0]}</div>
            <div style={{ textAlign: "center", fontWeight: 650, color: "var(--ink-faint)" }}>{t.labels[1]}</div>
            <div style={{ fontWeight: 650, color: "var(--ink-faint)" }}>{t.labels[0]}</div>{cell(CONFUSION[0][0], true)}{cell(CONFUSION[0][1], false)}
            <div style={{ fontWeight: 650, color: "var(--ink-faint)" }}>{t.labels[1]}</div>{cell(CONFUSION[1][0], false)}{cell(CONFUSION[1][1], true)}
          </div>
        </Card>
        <Card>
          <CardTitle sub={t.rocSub}>{t.roc}</CardTitle>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={ROC} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid stroke={c.grid} />
              <XAxis type="number" dataKey="fpr" domain={[0, 1]} tick={{ fontSize: 10, fill: c.tick }} axisLine={false} tickLine={false} />
              <YAxis type="number" domain={[0, 1]} tick={{ fontSize: 10, fill: c.tick }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle(c)} />
              <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke={c.tick} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="tpr" stroke={c.accent} strokeWidth={2.4} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <Card style={{ marginTop: 14 }}>
        <CardTitle sub={t.driversSub}>{t.drivers}</CardTitle>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={IMPORTANCE.map((f) => ({ ...f, name: lang === "ar" ? f.ar : f.feature }))} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid stroke={c.grid} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: c.tick }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11, fill: c.tick }} axisLine={false} tickLine={false} orientation={lang === "ar" ? "right" : "left"} />
            <Tooltip {...tooltipStyle(c)} />
            <Bar dataKey="importance" fill={c.accent} radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card style={{ marginTop: 14 }}>
        <CardTitle>{t.card}</CardTitle>
        <div style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.6 }}>{t.cardBody}</div>
      </Card>
    </>
  );
}
