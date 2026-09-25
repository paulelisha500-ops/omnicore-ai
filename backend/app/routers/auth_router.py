from fastapi import APIRouter, Depends, HTTPException, Request

from app.auth import create_access_token, get_current_user, verify_password
from app.db import get_pool
from app.ratelimit import check_login_allowed, clear_login_failures, record_login_failure
from app.schemas import LoginRequest, LoginResponse, UserOut

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, request: Request):
    # Throttle first, before touching the database or hashing anything, so a
    # blocked client can't use this endpoint to burn CPU on bcrypt.
    await check_login_allowed(request, req.username)

    try:
        pool = await get_pool()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Database isn't connected yet — try again in a few seconds.")

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT username, password_hash, full_name, role FROM users WHERE username = $1",
            req.username,
        )
    if row is None or not verify_password(req.password, row["password_hash"]):
        await record_login_failure(request, req.username)
        raise HTTPException(status_code=401, detail="Incorrect username or password.")

    await clear_login_failures(request, req.username)
    token = create_access_token(username=row["username"], full_name=row["full_name"], role=row["role"])
    return LoginResponse(
        access_token=token,
        user=UserOut(username=row["username"], full_name=row["full_name"], role=row["role"]),
    )


@router.get("/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    """The frontend calls this on load with whatever token it has stored,
    to confirm it's still valid (backend-verified, not just trusting
    whatever's sitting in localStorage) before showing the app instead of
    the login screen."""
    return UserOut(**user)
