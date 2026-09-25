"""
Minimal asyncpg-backed persistence — just enough for real authentication.

This is also the first thing in the project that actually writes to
Postgres (previously provisioned but unused, per backend/README.md's
honesty table). Deliberately not using an ORM/migration framework here:
one table, created and seeded idempotently on startup, is enough for what
this needs, and keeps the dependency list smaller.
"""
import logging

import asyncpg

from app.auth import hash_password
from app.config import settings

logger = logging.getLogger("omnicore.db")

_pool: asyncpg.Pool | None = None

# SQLAlchemy-style URL (postgresql+asyncpg://...) -> plain DSN asyncpg understands
_ASYNCPG_DSN = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

SEED_USERS = [
    # username, password, full_name, role — demo credentials, printed to the
    # backend log on first startup. Change/remove before this is anything
    # other than a local demo.
    {"username": "admin", "password": "admin123", "full_name": "Admin User", "role": "Platform Admin"},
    {"username": "analyst", "password": "analyst123", "full_name": "Sara Analyst", "role": "Analyst"},
]


async def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("DB pool not initialized — init_db() must run at startup")
    return _pool


async def init_db() -> None:
    global _pool
    try:
        _pool = await asyncpg.create_pool(_ASYNCPG_DSN, min_size=1, max_size=5)
    except Exception as e:
        logger.warning(
            f"Could not connect to Postgres at startup ({e}). Auth login will fail until "
            f"the database is reachable. If you're using `docker compose up`, Postgres "
            f"usually just needs a few more seconds on first boot — restart the backend "
            f"once it's ready if this was a cold start."
        )
        return

    async with _pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                role TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now()
            )
        """)

        # Automation rules (Module 09). Previously these lived in React state,
        # so every rule a user created vanished on refresh and the "runs"
        # counter was a hardcoded number that never moved.
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS automations (
                id SERIAL PRIMARY KEY,
                username TEXT NOT NULL,
                name TEXT NOT NULL,
                trigger TEXT NOT NULL,
                action TEXT NOT NULL,
                enabled BOOLEAN NOT NULL DEFAULT true,
                runs INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                last_run_at TIMESTAMPTZ
            )
        """)
        await conn.execute(
            "CREATE INDEX IF NOT EXISTS automations_username_idx ON automations (username)")

        # Activity events (Modules 10 + 11). The dashboard's 14-day trend was
        # a hardcoded array because nothing was ever persisted; with real rows
        # the chart can be computed from actual usage, and the audit log
        # survives a refresh.
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS activity_events (
                id BIGSERIAL PRIMARY KEY,
                username TEXT NOT NULL,
                module TEXT NOT NULL,
                action TEXT NOT NULL,
                detail TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """)
        # Supports both the audit list (newest first) and the daily rollup.
        await conn.execute(
            "CREATE INDEX IF NOT EXISTS activity_created_idx ON activity_events (created_at DESC)")
        count = await conn.fetchval("SELECT COUNT(*) FROM users")
        if count == 0:
            for u in SEED_USERS:
                await conn.execute(
                    "INSERT INTO users (username, password_hash, full_name, role) VALUES ($1, $2, $3, $4)",
                    u["username"], hash_password(u["password"]), u["full_name"], u["role"],
                )
            logger.info(
                "Seeded demo users (change these before this runs anywhere but your own "
                "machine): " + ", ".join(f"{u['username']}/{u['password']}" for u in SEED_USERS)
            )
