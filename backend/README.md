# OmniCore AI — Backend

Real, runnable FastAPI backend for the platform. For setup/running
instructions (Docker, cloud GPU, VS Code), see the **root** `README.md` —
this file just covers what's in here and how it's organized.

## What's real here vs. reference scaffolding

| Piece | Status |
|---|---|
| `app/routers/ai.py` — `POST /api/ai/complete` | **The one the frontend actually calls.** Routes to your self-hosted Ollama model by default, or Anthropic if `LLM_PROVIDER=anthropic`. Every AI-powered module in the frontend goes through this single endpoint. |
| `app/routers/analytics.py` — `/api/predict/churn` | **Fully real, provider-independent.** Loads `app/ml/churn_model.joblib`, the actual model trained in `ml/train_churn_model.py` on 7,043 real customer records. Try the `/docs` example payload. |
| `app/routers/chat.py`, `documents.py`, `vision.py` | **Reference examples, not used by the frontend.** These show the more "purpose-built, fixed-persona endpoint" pattern as an alternative to the generic `ai.py` approach — real code, but you'd need to call them directly (and set `ANTHROPIC_API_KEY`) to exercise them; the shipped frontend doesn't. |
| `app/routers/search.py` | **Scaffolding.** Documents the real approach (Postgres full-text + pgvector) rather than faking a search index that isn't there. |
| `app/routers/auth_router.py`, `app/db.py` | **Fully real.** Login against an actual Postgres `users` table — bcrypt-hashed passwords, signed JWT. Seeded demo accounts: `admin`/`admin123` (Platform Admin), `analyst`/`analyst123` (Analyst). |
| Redis (see root `docker-compose.yml`) | **Infra is real and starts correctly**, but nothing uses it yet in this cut — a natural next increment (rate limiting, caching, or session storage). Postgres, unlike Redis, is genuinely in use as of the auth system above. |

## Project layout

```
app/
├── main.py             # FastAPI app, CORS, router registration
├── config.py            # Settings — LLM_PROVIDER, Ollama/Anthropic config, DB/Redis URLs
├── schemas.py            # All Pydantic request/response models in one place
├── routers/
│   ├── ai.py              # Generic completion — what the frontend calls (Ollama/Anthropic)
│   ├── chat.py            # Module 01 reference example (Anthropic-specific, unused by frontend)
│   ├── documents.py       # Module 03 reference example (ditto)
│   ├── vision.py          # Module 02 reference example (ditto)
│   ├── analytics.py       # Module 06 — Predictive Analytics (real model, always active)
│   └── search.py          # Module 08 scaffolding
└── ml/
    └── churn_model.joblib  # the actual trained model
```

## Extending this

The remaining modules from the original spec (Speech AI's server-side
piece, AI Agent Platform, Recommendation Engine, Automation Platform,
Security & Governance, Integration Hub) follow the same router pattern —
add a file under `app/routers/`, define its schemas in `schemas.py`,
register it in `main.py`. Module 05 (Agents) and Module 11 (Security audit
log) are the two most worth doing next, since the frontend already has
real client-side logic for both that a backend route would just need to
persist. See the root `PROJECT_NOTES.md` for the full "what's next" list.
