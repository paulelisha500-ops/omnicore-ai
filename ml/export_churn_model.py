"""
Export the trained churn pipeline (ml/churn_model.joblib) to a compact JSON
file the browser can evaluate directly — frontend/public/models/churn-forest.json.

The app has no server, so the model runs client-side. Nothing is re-fitted or
approximated here: the StandardScaler statistics, the OneHotEncoder categories
and every split of every tree are copied out verbatim, and the script finishes
by re-scoring the held-out rows with a pure-Python evaluator of the exported
JSON and asserting it matches sklearn's own predict_proba.

    python ml/export_churn_model.py
"""
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
MODEL = ROOT / "ml" / "churn_model.joblib"
OUT = ROOT / "frontend" / "public" / "models" / "churn-forest.json"
CSV = ROOT / "ml" / "data" / "telco_churn.csv"
DATASET_URL = "https://raw.githubusercontent.com/IBM/telco-customer-churn-on-icp4d/master/data/Telco-Customer-Churn.csv"

pipe = joblib.load(MODEL)
prep, clf = pipe.named_steps["prep"], pipe.named_steps["clf"]
scaler = prep.named_transformers_["num"]
encoder = prep.named_transformers_["cat"]
num_cols = list(prep.transformers_[0][2])
cat_cols = list(prep.transformers_[1][2])

encoders = []
for col, cats, drop in zip(cat_cols, encoder.categories_,
                           encoder.drop_idx_ if encoder.drop_idx_ is not None else [None] * len(cat_cols)):
    cats = [str(c) for c in cats]
    kept = [c for i, c in enumerate(cats) if drop is None or i != int(drop)]
    encoders.append({"col": col, "categories": cats, "kept": kept})


trees = []
for est in clf.estimators_:
    t = est.tree_
    left, right = t.children_left.tolist(), t.children_right.tolist()
    feat, thr = t.feature.tolist(), t.threshold.tolist()
    val = t.value[:, 0, :]
    p1 = (val[:, 1] / val.sum(axis=1)).tolist()
    # Leaves carry the positive-class probability; internal nodes carry the split.
    trees.append({
        "f": [f if l != -1 else -1 for f, l in zip(feat, left)],
        # Full precision on purpose: sklearn compares float32(x) <= threshold,
        # and thresholds sit halfway between two float32 values, so rounding
        # them can flip a split for inputs right at the boundary.
        "t": [x if l != -1 else 0 for x, l in zip(thr, left)],
        "l": left, "r": right,
        "p": [round(p, 5) if l == -1 else 0 for p, l in zip(p1, left)],
    })

export = {
    "model": "random_forest",
    "n_estimators": len(trees),
    "numeric": [{"col": c, "mean": float(m), "scale": float(s)} for c, m, s in zip(num_cols, scaler.mean_, scaler.scale_)],
    "categorical": encoders,
    "trees": trees,
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(export, separators=(",", ":")))
print(f"wrote {OUT} ({OUT.stat().st_size/1e6:.2f} MB, {len(trees)} trees)")


# ---- verify: evaluate the JSON exactly like the browser does -------------
def vectorize(row):
    v = [(float(row[n["col"]]) - n["mean"]) / n["scale"] for n in export["numeric"]]
    for e in export["categorical"]:
        val = str(row[e["col"]])
        v += [1.0 if val == k else 0.0 for k in e["kept"]]
    return v


def proba(row):
    x = vectorize(row)
    s = 0.0
    for tr in export["trees"]:
        i = 0
        while tr["l"][i] != -1:
            i = tr["l"][i] if float(np.float32(x[tr["f"][i]])) <= tr["t"][i] else tr["r"][i]
        s += tr["p"][i]
    return s / len(export["trees"])


if not CSV.exists():
    CSV.parent.mkdir(parents=True, exist_ok=True)
    import urllib.request
    urllib.request.urlretrieve(DATASET_URL, CSV)
df = pd.read_csv(CSV)
df["TotalCharges"] = pd.to_numeric(df["TotalCharges"], errors="coerce").fillna(0)
X = df.drop(columns=["customerID", "Churn"]).sample(400, random_state=7)
ref = pipe.predict_proba(X)[:, 1]
mine = np.array([proba(row) for _, row in X.iterrows()])
err = float(np.abs(ref - mine).max())
print(f"max |sklearn - exported| over 400 rows: {err:.2e}")
assert err < 1e-4, "exported forest disagrees with sklearn"

# A few fixed rows so the JS evaluator can be checked against the same numbers.
fixtures = [{"row": {k: (v.item() if hasattr(v, "item") else v) for k, v in row.items()},
             "proba": round(float(p), 6)} for (_, row), p in zip(X.head(12).iterrows(), ref[:12])]
(ROOT / "ml" / "churn_fixtures.json").write_text(json.dumps(fixtures, indent=1))
print("wrote ml/churn_fixtures.json")
