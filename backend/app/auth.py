from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext

from app.config import settings

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_bearer = HTTPBearer(auto_error=False)

JWT_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _pwd_context.verify(password, password_hash)


def create_access_token(*, username: str, full_name: str, role: str) -> str:
    """
    Encodes user + role directly in the token so verifying a request is a
    pure signature check (no DB round-trip per request) — the DB is only
    consulted at login time, when the password is actually checked.
    """
    expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRY_HOURS)
    payload = {
        "sub": username,
        "full_name": full_name,
        "role": role,
        "exp": expires_at,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired — please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid authentication token.")


async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> dict:
    if creds is None:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    payload = decode_access_token(creds.credentials)
    return {"username": payload["sub"], "full_name": payload["full_name"], "role": payload["role"]}


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] != "Platform Admin":
        raise HTTPException(status_code=403, detail="This area requires a Platform Admin role.")
    return user
