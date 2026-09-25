"""
Login throttling, backed by the Redis already in the stack.

QA finding this addresses: 25 consecutive wrong passwords all returned 401 with
no lockout, so the seeded accounts could be brute-forced at API speed.

Two counters are checked per attempt, both over a sliding-ish fixed window:
  * per (client IP, username)  — stops guessing one account's password
  * per client IP              — stops one client spraying many usernames

Behaviour notes worth knowing:
  * A successful login clears the (IP, username) counter, so a legitimate user
    who fat-fingered a few times is not punished afterwards.
  * It FAILS OPEN if Redis is unreachable. That is a deliberate availability
    trade: taking Redis down should not lock every user out of the product. The
    cost is that throttling silently stops while Redis is down, which is logged.
  * Behind Docker Desktop's NAT every request can appear to come from one
    gateway IP, so the per-IP cap is set well above the per-account cap.
"""
import logging

import redis.asyncio as aioredis
from fastapi import HTTPException, Request

from app.config import settings

logger = logging.getLogger("omnicore.ratelimit")

WINDOW_SECONDS = 15 * 60
MAX_PER_ACCOUNT = 8
MAX_PER_IP = 60

_client: aioredis.Redis | None = None


def _redis() -> aioredis.Redis:
    global _client
    if _client is None:
        _client = aioredis.Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_timeout=2)
    return _client


def _ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


async def check_login_allowed(request: Request, username: str) -> None:
    """Raise 429 if this attempt is over budget. Call BEFORE verifying the password."""
    ip, user = _ip(request), username.strip().lower()[:80]
    try:
        r = _redis()
        pipe = r.pipeline()
        pipe.get(f"login:acct:{ip}:{user}")
        pipe.get(f"login:ip:{ip}")
        acct, per_ip = await pipe.execute()
        if int(acct or 0) >= MAX_PER_ACCOUNT or int(per_ip or 0) >= MAX_PER_IP:
            ttl = await r.ttl(f"login:acct:{ip}:{user}")
            retry = max(ttl if ttl and ttl > 0 else WINDOW_SECONDS, 1)
            raise HTTPException(
                status_code=429,
                detail=f"Too many failed sign-in attempts. Try again in {max(1, retry // 60)} minute(s).",
                headers={"Retry-After": str(retry)},
            )
    except HTTPException:
        raise
    except Exception as e:  # Redis down: fail open, but say so
        logger.warning("login rate limit unavailable (Redis): %s", e)


async def record_login_failure(request: Request, username: str) -> None:
    ip, user = _ip(request), username.strip().lower()[:80]
    try:
        r = _redis()
        pipe = r.pipeline()
        for key in (f"login:acct:{ip}:{user}", f"login:ip:{ip}"):
            pipe.incr(key)
            pipe.expire(key, WINDOW_SECONDS, nx=True)  # window starts at the first failure
        await pipe.execute()
    except Exception as e:
        logger.warning("login rate limit unavailable (Redis): %s", e)


async def clear_login_failures(request: Request, username: str) -> None:
    ip, user = _ip(request), username.strip().lower()[:80]
    try:
        await _redis().delete(f"login:acct:{ip}:{user}")
    except Exception:
        pass
