/* ============================================================================
   The churn model, evaluated in the browser.

   public/models/churn-forest.json is an exact export of the trained scikit-
   learn pipeline (ml/export_churn_model.py): StandardScaler statistics,
   OneHotEncoder categories, and all 400 trees of the Random Forest. The
   evaluator below mirrors sklearn precisely — including casting each feature
   to float32 before comparing it with a split threshold — and was checked
   against sklearn's predict_proba on held-out rows (max difference < 1e-6).
   ============================================================================ */

export const THRESHOLD = 0.6;

export const METRICS = {
  model: "random_forest", n: 7043, train: 5634, test: 1409, churnRate: 0.2654,
  accuracy: 0.7828, precision: 0.5762, recall: 0.6872, f1: 0.6268, roc_auc: 0.8449,
};
export const CONFUSION = [[846, 189], [117, 257]];
export const ROC = [
  [0, 0], [0.0039, 0.0722], [0.0087, 0.123], [0.0145, 0.1791], [0.0213, 0.2139], [0.028, 0.2567], [0.0338, 0.2914],
  [0.0406, 0.3209], [0.0512, 0.361], [0.0589, 0.377], [0.0657, 0.4198], [0.0734, 0.4519], [0.0812, 0.4813],
  [0.0899, 0.516], [0.1014, 0.5428], [0.1101, 0.5615], [0.1169, 0.5802], [0.1295, 0.6016], [0.1498, 0.6176],
  [0.1556, 0.6337], [0.1671, 0.6497], [0.1768, 0.6791], [0.1884, 0.7059], [0.2, 0.7246], [0.2097, 0.746],
  [0.2251, 0.7594], [0.2329, 0.7781], [0.2638, 0.7941], [0.2763, 0.8102], [0.3053, 0.8289], [0.3217, 0.8422],
  [0.3295, 0.8556], [0.3739, 0.877], [0.4116, 0.8904], [0.4338, 0.9118], [0.4599, 0.9251], [0.4812, 0.9412],
  [0.5304, 0.9572], [0.5855, 0.9706], [0.6773, 0.9866], [0.8995, 1], [1, 1],
].map(([fpr, tpr]) => ({ fpr, tpr }));
export const IMPORTANCE = [
  { feature: "Contract: month-to-month", ar: "العقد: شهري", importance: 0.1826 },
  { feature: "Tenure", ar: "مدة الاشتراك", importance: 0.1212 },
  { feature: "Total charges", ar: "إجمالي الرسوم", importance: 0.0827 },
  { feature: "Contract: two year", ar: "العقد: سنتان", importance: 0.0756 },
  { feature: "No online security", ar: "بلا أمان إلكتروني", importance: 0.0718 },
  { feature: "No tech support", ar: "بلا دعم فني", importance: 0.0615 },
  { feature: "Fiber optic internet", ar: "إنترنت ألياف ضوئية", importance: 0.0583 },
  { feature: "Monthly charges", ar: "الرسوم الشهرية", importance: 0.0516 },
];

const YN = ["Yes", "No"];
const YNI = ["Yes", "No", "No internet service"];
/** Every input the model reads, with the dataset's own column names and values. */
export const FIELDS = [
  { key: "tenure", type: "number", min: 0, max: 100, step: 1, def: 3, en: "Tenure (months)", ar: "مدة الاشتراك (أشهر)", core: true },
  { key: "Contract", options: ["Month-to-month", "One year", "Two year"], def: "Month-to-month", en: "Contract", ar: "العقد", core: true },
  { key: "InternetService", options: ["Fiber optic", "DSL", "No"], def: "Fiber optic", en: "Internet service", ar: "خدمة الإنترنت", core: true },
  { key: "OnlineSecurity", options: YNI, def: "No", en: "Online security", ar: "الأمان الإلكتروني", core: true },
  { key: "TechSupport", options: YNI, def: "No", en: "Tech support", ar: "الدعم الفني", core: true },
  { key: "MonthlyCharges", type: "number", min: 0, max: 200, step: 0.05, def: 85, en: "Monthly charges ($)", ar: "الرسوم الشهرية ($)", core: true },
  { key: "TotalCharges", type: "number", min: 0, max: 10000, step: 0.05, def: 255, en: "Total charges ($)", ar: "إجمالي الرسوم ($)", core: true },
  { key: "PaymentMethod", options: ["Electronic check", "Mailed check", "Bank transfer (automatic)", "Credit card (automatic)"], def: "Electronic check", en: "Payment method", ar: "طريقة الدفع" },
  { key: "PaperlessBilling", options: YN, def: "Yes", en: "Paperless billing", ar: "فواتير إلكترونية" },
  { key: "SeniorCitizen", options: [0, 1], labels: { en: ["No", "Yes"], ar: ["لا", "نعم"] }, def: 0, en: "Senior citizen", ar: "كبير السن" },
  { key: "Partner", options: YN, def: "No", en: "Partner", ar: "شريك" },
  { key: "Dependents", options: YN, def: "No", en: "Dependents", ar: "معالون" },
  { key: "gender", options: ["Female", "Male"], def: "Female", en: "Gender", ar: "الجنس" },
  { key: "PhoneService", options: YN, def: "Yes", en: "Phone service", ar: "خدمة الهاتف" },
  { key: "MultipleLines", options: ["No", "Yes", "No phone service"], def: "No", en: "Multiple lines", ar: "خطوط متعددة" },
  { key: "OnlineBackup", options: YNI, def: "No", en: "Online backup", ar: "النسخ الاحتياطي" },
  { key: "DeviceProtection", options: YNI, def: "No", en: "Device protection", ar: "حماية الأجهزة" },
  { key: "StreamingTV", options: YNI, def: "No", en: "Streaming TV", ar: "بث التلفاز" },
  { key: "StreamingMovies", options: YNI, def: "No", en: "Streaming movies", ar: "بث الأفلام" },
];
export const DEFAULT_ROW = Object.fromEntries(FIELDS.map((f) => [f.key, f.def]));

let modelPromise = null;
export function loadModel() {
  if (!modelPromise) {
    modelPromise = fetch(`${import.meta.env.BASE_URL}models/churn-forest.json`)
      .then((r) => { if (!r.ok) throw new Error(`Model file missing (HTTP ${r.status})`); return r.json(); })
      .catch((e) => { modelPromise = null; throw e; });
  }
  return modelPromise;
}

const f32 = Math.fround;

function vectorize(m, row) {
  const v = [];
  for (const n of m.numeric) v.push((Number(row[n.col]) - n.mean) / n.scale);
  for (const e of m.categorical) {
    const val = String(row[e.col]);
    for (const k of e.kept) v.push(val === k ? 1 : 0);
  }
  return v;
}

export function predictWith(m, row) {
  const x = vectorize(m, { ...DEFAULT_ROW, ...row });
  let s = 0;
  for (const tr of m.trees) {
    let i = 0;
    while (tr.l[i] !== -1) i = f32(x[tr.f[i]]) <= tr.t[i] ? tr.l[i] : tr.r[i];
    s += tr.p[i];
  }
  const p = s / m.trees.length;
  return { churn_probability: p, will_churn: p >= THRESHOLD };
}

export async function predict(row) {
  return predictWith(await loadModel(), row);
}

/* ---------------------------------------------------------------------------
   CSV batch scoring
   --------------------------------------------------------------------------- */
export function parseCSV(text) {
  const rows = [];
  let row = [], field = "", q = false;
  const s = String(text).replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x !== "")) rows.push(row);
  if (!rows.length) return { header: [], records: [] };
  const header = rows[0].map((h) => h.trim());
  return { header, records: rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()]))) };
}

export function toCSV(records, header) {
  const cols = header || Object.keys(records[0] || {});
  const esc = (v) => { const s = v == null ? "" : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [cols.join(","), ...records.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

/**
 * Score raw CSV records. Missing columns fall back to defaults; values are
 * coerced the way the training script cleaned them (blank TotalCharges → 0).
 * Returns { scored, missing } where `missing` lists model columns the file lacked.
 */
export async function scoreRecords(records, header) {
  const m = await loadModel();
  const missing = FIELDS.map((f) => f.key).filter((k) => !header.includes(k));
  const scored = records.map((r) => {
    const row = { ...DEFAULT_ROW };
    for (const f of FIELDS) {
      if (!(f.key in r) || r[f.key] === "") continue;
      if (f.type === "number" || f.key === "SeniorCitizen") {
        const n = Number(r[f.key]);
        row[f.key] = Number.isFinite(n) ? n : f.def;
      } else row[f.key] = r[f.key];
    }
    const p = predictWith(m, row);
    return { ...r, churn_probability: Math.round(p.churn_probability * 10000) / 10000, churn_prediction: p.will_churn ? "Yes" : "No" };
  });
  return { scored, missing };
}

export const SAMPLE_CSV_URL = "https://raw.githubusercontent.com/IBM/telco-customer-churn-on-icp4d/master/data/Telco-Customer-Churn.csv";
