from typing import Literal
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Which backend powers /api/ai/complete. Defaults to your own self-hosted
    # model now — set back to "anthropic" any time to switch without code changes.
    LLM_PROVIDER: Literal["ollama", "anthropic"] = "ollama"

    # --- Self-hosted (Ollama) ---
    # Same docker-compose network -> "http://ollama:11434" (default, works if
    # Ollama runs as a service in this project's docker-compose.yml).
    # Ollama on a separate cloud GPU box -> "http://<that box's address>:11434".
    OLLAMA_BASE_URL: str = "http://ollama:11434"
    OLLAMA_TEXT_MODEL: str = "qwen3:4b"        # CPU-friendly default; use qwen3:14b on a real GPU
    OLLAMA_VISION_MODEL: str = "qwen2.5vl:7b"  # strong multilingual OCR (incl. Arabic); slow on CPU
    # A deliberately smaller model for jobs where latency matters more than
    # depth — currently the Trade module's source summaries, which are
    # constrained to restating retrieved text and don't need a 4B model's
    # reasoning. Measured CPU generation for qwen3:4b on this stack is
    # ~2.4 tok/s, which made a cited paragraph take minutes; the 1.7b is
    # several times faster at a task that is mostly extraction.
    OLLAMA_FAST_MODEL: str = "qwen3:1.7b"
    SEARXNG_URL: str = "http://searxng:8080"   # self-hosted metasearch, used by the web_search tool
    # How long Ollama keeps a model resident between requests.
    #
    # Left at Ollama's own default deliberately. Raising it to "30m" does
    # remove a measured ~175s cold-reload penalty, but on a host where Docker
    # only has ~3.7GB (qwen3:4b alone is 2.5GB) a pinned model leaves no room
    # for a second one, and testing two models in the same session took the
    # Docker VM down. Raise this only alongside a larger Docker memory
    # allocation — 8GB+ makes it a clear win.
    OLLAMA_KEEP_ALIVE: str = "5m"

    # --- Anthropic (fallback / comparison) ---
    ANTHROPIC_API_KEY: str = ""
    # Current, valid model id as of this build (verified against Anthropic's
    # docs — see PROJECT_NOTES.md for how/why this was chosen over aliases).
    ANTHROPIC_MODEL: str = "claude-sonnet-4-6"

    DATABASE_URL: str = "postgresql+asyncpg://omnicore:omnicore@postgres:5432/omnicore"
    REDIS_URL: str = "redis://redis:6379/0"
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Auth. Deliberately has NO default. This used to ship a committed
    # "dev-only-secret" so the project ran out of the box, and QA showed the
    # cost: a token signed with that public string, claiming Platform Admin,
    # was accepted by the running API (HTTP 200 on the admin-only audit log).
    # Anyone who can read the repo could mint admin tokens for any deployment
    # that forgot to override it. Now the backend refuses to start without a
    # real secret — generate one with:
    #   python -c "import secrets; print(secrets.token_urlsafe(48))"
    JWT_SECRET: str
    JWT_EXPIRY_HOURS: int = 24

    @field_validator("JWT_SECRET")
    @classmethod
    def _jwt_secret_must_be_strong(cls, v: str) -> str:
        if v.startswith("dev-only-secret") or len(v) < 32:
            raise ValueError(
                "JWT_SECRET must be a random string of at least 32 characters "
                "(not the old committed dev default). Set it in .env — see .env.example."
            )
        return v

    # Should match the tuned decision threshold in train_churn_model.py —
    # keep these in sync if the model is retrained.
    CHURN_DECISION_THRESHOLD: float = 0.60

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
