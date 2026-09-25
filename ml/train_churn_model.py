"""
OmniCore AI — Predictive Analytics Module
Customer Churn Prediction — Model Training & Evaluation

Dataset: IBM Watson Telco Customer Churn (7,043 real customer records, 21 features)
Source:  https://github.com/IBM/telco-customer-churn-on-icp4d

This script trains and honestly evaluates three classifiers, selects the best one
by cross-validated F1 (not accuracy alone — the target class is imbalanced at
~26.6% churn, so a model that always predicts "No churn" would score ~73.4%
accuracy while being useless), and exports (into ml/artifacts/):
  - metrics.json           -> real precision/recall/F1/ROC-AUC/accuracy for the app UI
  - confusion_matrix.json  -> for the confusion matrix chart in the app
  - roc_curve.json         -> for the ROC chart in the app
  - feature_importance.json-> top drivers of churn, for the "AI insight" panel
  - churn_model.joblib     -> the trained pipeline

...and also copies churn_model.joblib into backend/app/ml/, so re-running
this script keeps the live backend's model in sync with a fresh training run.

Fully self-contained: downloads the real dataset on first run if it isn't
already present locally. No manual data prep needed.

Run from anywhere:  python3 ml/train_churn_model.py
             or:     cd ml && python3 train_churn_model.py
"""

import json
import shutil
import urllib.request
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, roc_curve, confusion_matrix, classification_report
)
from xgboost import XGBClassifier
import joblib

warnings.filterwarnings("ignore")
RANDOM_STATE = 42

SCRIPT_DIR = Path(__file__).resolve().parent          # .../ml
PROJECT_ROOT = SCRIPT_DIR.parent                        # .../omnicore-ai
DATA_DIR = SCRIPT_DIR / "data"
ARTIFACTS_DIR = SCRIPT_DIR / "artifacts"
BACKEND_MODEL_PATH = PROJECT_ROOT / "backend" / "app" / "ml" / "churn_model.joblib"
DATASET_URL = "https://raw.githubusercontent.com/IBM/telco-customer-churn-on-icp4d/master/data/Telco-Customer-Churn.csv"

DATA_DIR.mkdir(exist_ok=True)
ARTIFACTS_DIR.mkdir(exist_ok=True)

# ---------------------------------------------------------------------------
# 1. Load & clean (auto-downloads the real dataset on first run)
# ---------------------------------------------------------------------------
csv_path = DATA_DIR / "telco_churn.csv"
if not csv_path.exists():
    print(f"Dataset not found locally — downloading from {DATASET_URL} ...")
    urllib.request.urlretrieve(DATASET_URL, csv_path)
    print(f"Saved to {csv_path}")

df = pd.read_csv(csv_path)

# TotalCharges is stored as text and has 11 blank strings for brand-new
# customers (tenure=0) that were never billed yet -- coerce + fill with 0,
# which is the correct real-world value, not a missing-data artifact.
df["TotalCharges"] = pd.to_numeric(df["TotalCharges"], errors="coerce").fillna(0)
df = df.drop(columns=["customerID"])
df["Churn"] = (df["Churn"] == "Yes").astype(int)

y = df["Churn"]
X = df.drop(columns=["Churn"])

numeric_features = ["tenure", "MonthlyCharges", "TotalCharges", "SeniorCitizen"]
categorical_features = [c for c in X.columns if c not in numeric_features]

preprocess = ColumnTransformer([
    ("num", StandardScaler(), numeric_features),
    ("cat", OneHotEncoder(handle_unknown="ignore", drop="if_binary"), categorical_features),
])

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE
)

print(f"Train: {X_train.shape[0]} rows | Test: {X_test.shape[0]} rows")
print(f"Churn rate: {y.mean():.1%}  (imbalanced -> optimizing for F1, not raw accuracy)")

# ---------------------------------------------------------------------------
# 2. Candidate models (class-imbalance aware)
# ---------------------------------------------------------------------------
candidates = {
    "logistic_regression": Pipeline([
        ("prep", preprocess),
        ("clf", LogisticRegression(max_iter=2000, class_weight="balanced", random_state=RANDOM_STATE)),
    ]),
    "random_forest": Pipeline([
        ("prep", preprocess),
        ("clf", RandomForestClassifier(
            n_estimators=400, max_depth=8, min_samples_leaf=15,
            class_weight="balanced", random_state=RANDOM_STATE, n_jobs=-1)),
    ]),
    "xgboost": Pipeline([
        ("prep", preprocess),
        ("clf", XGBClassifier(
            n_estimators=300, max_depth=4, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8,
            scale_pos_weight=(y_train == 0).sum() / (y_train == 1).sum(),
            eval_metric="logloss", random_state=RANDOM_STATE)),
    ]),
}

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
cv_results = {}
for name, pipe in candidates.items():
    scores = cross_val_score(pipe, X_train, y_train, cv=cv, scoring="f1")
    cv_results[name] = {"mean_f1": float(scores.mean()), "std_f1": float(scores.std())}
    print(f"{name:22s}  5-fold CV F1 = {scores.mean():.4f} (+/- {scores.std():.4f})")

best_name = max(cv_results, key=lambda k: cv_results[k]["mean_f1"])
best_pipe = candidates[best_name]
print(f"\nBest model by cross-validated F1: {best_name}")

# ---------------------------------------------------------------------------
# 3. Tune the decision threshold — on a validation split, NOT the test set
# ---------------------------------------------------------------------------
# Accuracy at the default 0.5 threshold undersells this model: churn is the
# minority class, so precision/recall trade off sharply with the threshold.
# We pick the threshold that maximizes F1 on a validation split carved out
# of *training* data only, then touch the test set exactly once, at the end,
# with that threshold already fixed. Tuning directly on the test set would
# be leakage and would quietly inflate the reported numbers.
X_tr, X_val, y_tr, y_val = train_test_split(
    X_train, y_train, test_size=0.2, stratify=y_train, random_state=RANDOM_STATE
)
best_pipe.fit(X_tr, y_tr)
val_proba = best_pipe.predict_proba(X_val)[:, 1]
best_f1, best_threshold = 0.0, 0.5
for t in np.arange(0.30, 0.71, 0.02):
    f1 = f1_score(y_val, (val_proba >= t).astype(int))
    if f1 > best_f1:
        best_f1, best_threshold = f1, round(float(t), 2)
print(f"Decision threshold tuned on validation split: {best_threshold} (val F1 = {best_f1:.4f})")

# Refit on all non-test data (train + val) with the threshold now fixed,
# then evaluate ONCE, on the held-out test set.
best_pipe.fit(X_train, y_train)

# ---------------------------------------------------------------------------
# 4. Honest evaluation on the held-out test set
# ---------------------------------------------------------------------------
y_proba = best_pipe.predict_proba(X_test)[:, 1]
y_pred = (y_proba >= best_threshold).astype(int)

metrics = {
    "model": best_name,
    "dataset": "IBM Watson Telco Customer Churn (real, n=7043)",
    "source": "github.com/IBM/telco-customer-churn-on-icp4d",
    "test_size": int(len(X_test)),
    "train_size": int(len(X_train)),
    "churn_rate": round(float(y.mean()), 4),
    "decision_threshold": best_threshold,
    "threshold_note": "Tuned to maximize F1 on a held-out validation split (not the test set), then evaluated once on test.",
    "accuracy": round(accuracy_score(y_test, y_pred), 4),
    "precision": round(precision_score(y_test, y_pred), 4),
    "recall": round(recall_score(y_test, y_pred), 4),
    "f1": round(f1_score(y_test, y_pred), 4),
    "roc_auc": round(roc_auc_score(y_test, y_proba), 4),
    "cv_f1_by_model": cv_results,
}
print("\n=== TEST SET METRICS (held-out, never seen during training or tuning) ===")
for k in ["accuracy", "precision", "recall", "f1", "roc_auc"]:
    print(f"  {k:10s}: {metrics[k]:.4f}")
print()
print(classification_report(y_test, y_pred, target_names=["No churn", "Churn"]))

cm = confusion_matrix(y_test, y_pred).tolist()
fpr, tpr, _ = roc_curve(y_test, y_proba)
roc_points = [{"fpr": round(float(f), 4), "tpr": round(float(t), 4)}
              for f, t in zip(fpr[::max(1, len(fpr)//40)], tpr[::max(1, len(tpr)//40)])]

# Feature importance (works for RF and XGB natively; for LR use abs coefficients)
feature_names = best_pipe.named_steps["prep"].get_feature_names_out()
clf = best_pipe.named_steps["clf"]
if hasattr(clf, "feature_importances_"):
    importances = clf.feature_importances_
else:
    importances = np.abs(clf.coef_[0])
top_idx = np.argsort(importances)[::-1][:8]
feature_importance = [
    {"feature": feature_names[i].split("__")[-1], "importance": round(float(importances[i]), 4)}
    for i in top_idx
]

# ---------------------------------------------------------------------------
# 4. Export everything the app / backend needs
# ---------------------------------------------------------------------------
with open(ARTIFACTS_DIR / "metrics.json", "w") as f:
    json.dump(metrics, f, indent=2)
with open(ARTIFACTS_DIR / "confusion_matrix.json", "w") as f:
    json.dump({"labels": ["No churn", "Churn"], "matrix": cm}, f, indent=2)
with open(ARTIFACTS_DIR / "roc_curve.json", "w") as f:
    json.dump(roc_points, f, indent=2)
with open(ARTIFACTS_DIR / "feature_importance.json", "w") as f:
    json.dump(feature_importance, f, indent=2)

model_path = ARTIFACTS_DIR / "churn_model.joblib"
joblib.dump(best_pipe, model_path)
print(f"\nSaved artifacts to {ARTIFACTS_DIR}/")

# Keep the live backend's model in sync with this training run.
if BACKEND_MODEL_PATH.parent.exists():
    shutil.copy(model_path, BACKEND_MODEL_PATH)
    print(f"Also updated the live backend model at {BACKEND_MODEL_PATH}")
    print("Restart the backend (or it'll pick this up on next container start) to serve the new model.")
else:
    print(f"Note: {BACKEND_MODEL_PATH.parent} doesn't exist — skipped syncing to the backend.")

print("\nNOTE: frontend/src/App.jsx embeds a snapshot of these metrics as static")
print("constants (REAL_CHURN_METRICS etc.) so the UI works without a live call.")
print("If you retrain and want the displayed numbers to match, copy the new")
print(f"values from {ARTIFACTS_DIR}/metrics.json into those constants by hand.")
print(f"\nAlso check backend/app/config.py -> CHURN_DECISION_THRESHOLD matches")
print(f"the tuned threshold above ({best_threshold}) if you retrain on different data.")
