"""
OmniCore AI — FastAPI backend.

The frontend (frontend/src/App.jsx) calls this backend's POST /api/ai/complete
for every AI-powered module — it no longer talks to any model provider
directly. This backend then routes that request to your self-hosted Ollama
model (LLM_PROVIDER=ollama, the default) or to Anthropic (LLM_PROVIDER=anthropic),
per app/config.py. This is also where the real trained churn model is
served from disk (app/ml/churn_model.joblib) instead of re-described in
JavaScript.

Run locally:
    uvicorn app.main:app --reload

Run via Docker (from the project root, not here):
    docker compose up --build
"""
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import get_current_user
from app.config import settings
from app.db import init_db
from app.routers import (ai, auth_router, chat, documents, vision, analytics, search,
                         trade, workspace)

app = FastAPI(
    title="OmniCore AI API",
    description="Enterprise Multimodal AI Operating System — backend reference implementation",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await init_db()  # creates + seeds the users table if this is a first run


# Auth is the only router that must stay open (it's how you obtain a token).
# Everything else is gated here, once, at include time — QA found /api/search,
# /api/trade/research and /api/ai/complete answering anonymous callers, which
# let anyone drive the self-hosted model and burn the SearXNG engines' rate
# budget. Gating at the router level means a route added later is protected by
# default instead of relying on someone remembering a per-route Depends.
_authed = [Depends(get_current_user)]

app.include_router(auth_router.router, prefix="/api/auth", tags=["Auth"])
app.include_router(ai.router, prefix="/api/ai", tags=["Generic completion (used by the frontend)"], dependencies=_authed)
app.include_router(chat.router, prefix="/api/chat", tags=["Module 01 — AI Chat Assistant (reference/example)"], dependencies=_authed)
app.include_router(documents.router, prefix="/api/documents", tags=["Module 03 — Document Intelligence (reference/example)"], dependencies=_authed)
app.include_router(vision.router, prefix="/api/vision", tags=["Module 02 — Computer Vision (reference/example)"], dependencies=_authed)
app.include_router(analytics.router, prefix="/api/predict", tags=["Module 06 — Predictive Analytics (used by the frontend)"], dependencies=_authed)
app.include_router(search.router, prefix="/api/search", tags=["Module 08 — Enterprise Search (used by the frontend)"], dependencies=_authed)
app.include_router(trade.router, prefix="/api/trade", tags=["Module 13 — Trade & Regulatory Intelligence (used by the frontend)"], dependencies=_authed)
app.include_router(workspace.router, prefix="/api/workspace", tags=["Modules 09/10/11 — Automations, activity trend, audit log (persisted)"], dependencies=_authed)


@app.get("/health", tags=["System"])
def health():
    return {"status": "ok", "service": "omnicore-ai-api", "version": app.version}
