from pathlib import Path

import joblib
import pandas as pd
from fastapi import APIRouter, HTTPException

from app.config import settings
from app.schemas import ChurnPredictionRequest, ChurnPredictionResponse

router = APIRouter()

MODEL_PATH = Path(__file__).resolve().parent.parent / "ml" / "churn_model.joblib"
_model = None  # lazy-loaded singleton, avoids reloading the pickle on every request


def get_model():
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise HTTPException(
                status_code=503,
                detail=f"Model file not found at {MODEL_PATH}. Run train_churn_model.py and copy "
                       f"churn_model.joblib into app/ml/ first.",
            )
        _model = joblib.load(MODEL_PATH)
    return _model


@router.post("/churn", response_model=ChurnPredictionResponse)
def predict_churn(req: ChurnPredictionRequest):
    """
    Loads the actual model trained in train_churn_model.py (Random Forest,
    selected by 5-fold CV F1 on the real IBM Telco Customer Churn dataset;
    held-out test performance: 78.3% accuracy, 84.5% ROC-AUC, 62.7% F1 —
    see PROJECT_NOTES.md for the full evaluation and why accuracy alone is
    the wrong metric here).
    """
    model = get_model()
    row = pd.DataFrame([req.model_dump()])
    proba = float(model.predict_proba(row)[0, 1])
    return ChurnPredictionResponse(
        churn_probability=round(proba, 4),
        will_churn=proba >= settings.CHURN_DECISION_THRESHOLD,
        threshold_used=settings.CHURN_DECISION_THRESHOLD,
    )
