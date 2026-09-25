from typing import Any, Literal, Optional, Union
from pydantic import BaseModel, ConfigDict, Field



# ---------------------------------------------------------------------------
# Generic AI completion (used by /api/ai/complete)
# `content` is either a plain string or Anthropic's content-block array
# (e.g. [{"type": "image", "source": {...}}, {"type": "text", "text": "..."}])
# so image-bearing requests from Document Intelligence / Computer Vision
# pass straight through unchanged.
# ---------------------------------------------------------------------------
class CompletionMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: Union[str, list[dict[str, Any]]]


class CompletionRequest(BaseModel):
    system: str
    messages: list[CompletionMessage]
    max_tokens: int = Field(default=1000, ge=1, le=4096)
    enable_tools: bool = False  # lets the model call web_search when it decides it needs current info


class CompletionResponse(BaseModel):
    text: str


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
class LoginRequest(BaseModel):
    # Bounded: QA sent a 100,000-character username and the API accepted it
    # (and spent a bcrypt-adjacent code path on it). Real usernames are short.
    username: str = Field(..., min_length=1, max_length=80)
    password: str = Field(..., min_length=1, max_length=200)


class UserOut(BaseModel):
    username: str
    full_name: str
    role: str


class LoginResponse(BaseModel):
    access_token: str
    user: UserOut


# ---------------------------------------------------------------------------
# Module 01 — AI Chat Assistant
# ---------------------------------------------------------------------------
class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    # In production these resolve against a real vector store (pgvector /
    # Pinecone / etc). The frontend demo mirrors this pattern client-side
    # with a small in-memory snippet list injected straight into the prompt.
    knowledge_base_ids: list[str] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str


# ---------------------------------------------------------------------------
# Module 03 — Document Intelligence
# ---------------------------------------------------------------------------
class DocumentTextRequest(BaseModel):
    text: str


class DocumentAnalysis(BaseModel):
    summary: str
    key_points: list[str]


class DocumentQuestionRequest(BaseModel):
    document_text: str
    question: str


class DocumentQuestionResponse(BaseModel):
    answer: str


# ---------------------------------------------------------------------------
# Module 02 — Computer Vision
# ---------------------------------------------------------------------------
class VisionAnalysis(BaseModel):
    scene: str
    objects: list[str]
    text_found: list[str]
    notes: list[str]


# ---------------------------------------------------------------------------
# Module 06 — Predictive Analytics (churn model)
# Field names intentionally mirror the source dataset's columns exactly,
# since the trained sklearn ColumnTransformer selects columns by name.
# ---------------------------------------------------------------------------
class ChurnPredictionRequest(BaseModel):
    # High-impact fields (per the model's real feature importances) — the
    # frontend's "what-if" predictor only asks for these.
    tenure: int = Field(ge=0, le=100, description="Months as a customer")
    Contract: Literal["Month-to-month", "One year", "Two year"]
    InternetService: Literal["DSL", "Fiber optic", "No"]
    OnlineSecurity: Literal["Yes", "No", "No internet service"]
    TechSupport: Literal["Yes", "No", "No internet service"]
    MonthlyCharges: float = Field(ge=0)
    TotalCharges: float = Field(ge=0)

    # Lower-impact fields — defaulted so callers can omit them entirely.
    gender: Literal["Male", "Female"] = "Female"
    SeniorCitizen: Literal[0, 1] = 0
    Partner: Literal["Yes", "No"] = "No"
    Dependents: Literal["Yes", "No"] = "No"
    PhoneService: Literal["Yes", "No"] = "Yes"
    MultipleLines: Literal["Yes", "No", "No phone service"] = "No"
    OnlineBackup: Literal["Yes", "No", "No internet service"] = "No"
    DeviceProtection: Literal["Yes", "No", "No internet service"] = "No"
    StreamingTV: Literal["Yes", "No", "No internet service"] = "No"
    StreamingMovies: Literal["Yes", "No", "No internet service"] = "No"
    PaperlessBilling: Literal["Yes", "No"] = "Yes"
    PaymentMethod: Literal[
        "Electronic check", "Mailed check", "Bank transfer (automatic)", "Credit card (automatic)"
    ] = "Electronic check"

    class Config:
        json_schema_extra = {
            "example": {
                "gender": "Female", "SeniorCitizen": 0, "Partner": "Yes", "Dependents": "No",
                "tenure": 3, "PhoneService": "Yes", "MultipleLines": "No",
                "InternetService": "Fiber optic", "OnlineSecurity": "No", "OnlineBackup": "No",
                "DeviceProtection": "No", "TechSupport": "No", "StreamingTV": "No",
                "StreamingMovies": "No", "Contract": "Month-to-month", "PaperlessBilling": "Yes",
                "PaymentMethod": "Electronic check", "MonthlyCharges": 85.5, "TotalCharges": 256.5,
            }
        }


class ChurnPredictionResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    churn_probability: float
    will_churn: bool
    threshold_used: float
    model_version: str = "random_forest_v1"


# ---------------------------------------------------------------------------
# Module 08 — Enterprise Search
# ---------------------------------------------------------------------------
class SearchResult(BaseModel):
    type: Literal["kb", "chat", "email", "db", "image"]
    title: str
    snippet: Optional[str] = None
    score: float


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResult]
