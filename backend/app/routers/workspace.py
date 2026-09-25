"""
Persistence for Modules 09 (Automation), 10 (Executive Dashboard) and
11 (Security & Governance).

These three shared a single weakness: everything lived in React state, so
automation rules vanished on refresh, the audit log started empty every
session, and the dashboard's "last 14 days" chart was a hardcoded array of
invented numbers. This router backs them with real Postgres rows, which is
what lets the trend be *computed* from usage instead of asserted.

Scoping: rows are per-username. Every endpoint takes the caller's identity
from the JWT rather than a request field, so one account cannot read or
mutate another's automations by passing a different name.
"""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from pydantic import BaseModel, ConfigDict, Field

from app.auth import get_current_user, require_admin
from app.db import get_pool

router = APIRouter()

# Postgres SERIAL is int4. QA sent id=99999999999999999999 and asyncpg raised an
# integer-out-of-range error that surfaced as an unhandled 500 — bounding the
# path parameter turns that into a clean 422 before it reaches the driver.
AutomationId = Path(..., ge=1, le=2_147_483_647)


# --------------------------------------------------------------------------
# Automations
# --------------------------------------------------------------------------
class AutomationIn(BaseModel):
    # Strip before length-checking: min_length=1 alone accepted "   " (three
    # spaces) as a valid name/trigger/action, creating blank-looking rules.
    model_config = ConfigDict(str_strip_whitespace=True)
    name: str = Field(..., min_length=1, max_length=160)
    trigger: str = Field(..., min_length=1, max_length=400)
    action: str = Field(..., min_length=1, max_length=400)
    enabled: bool = True


class Automation(AutomationIn):
    id: int
    runs: int
    created_at: str
    last_run_at: str | None = None


@router.get("/automations", response_model=list[Automation])
async def list_automations(user=Depends(get_current_user)):
    pool = await get_pool()
    rows = await pool.fetch(
        "SELECT id, name, trigger, action, enabled, runs, created_at, last_run_at "
        "FROM automations WHERE username = $1 ORDER BY created_at DESC",
        user["username"],
    )
    return [_automation_row(r) for r in rows]


@router.post("/automations", response_model=Automation, status_code=201)
async def create_automation(body: AutomationIn, user=Depends(get_current_user)):
    pool = await get_pool()
    row = await pool.fetchrow(
        "INSERT INTO automations (username, name, trigger, action, enabled) "
        "VALUES ($1, $2, $3, $4, $5) "
        "RETURNING id, name, trigger, action, enabled, runs, created_at, last_run_at",
        user["username"], body.name, body.trigger, body.action, body.enabled,
    )
    return _automation_row(row)


@router.patch("/automations/{automation_id}", response_model=Automation)
async def toggle_automation(automation_id: int = AutomationId, enabled: bool = Query(...), user=Depends(get_current_user)):
    pool = await get_pool()
    row = await pool.fetchrow(
        "UPDATE automations SET enabled = $1 WHERE id = $2 AND username = $3 "
        "RETURNING id, name, trigger, action, enabled, runs, created_at, last_run_at",
        enabled, automation_id, user["username"],
    )
    if not row:
        raise HTTPException(status_code=404, detail="Automation not found")
    return _automation_row(row)


@router.post("/automations/{automation_id}/run", response_model=Automation)
async def run_automation(automation_id: int = AutomationId, user=Depends(get_current_user)):
    """
    Records an execution. This is a real counter increment against a real row —
    what it does *not* do is dispatch external side effects (sending the email,
    filing the ticket), because there is no job queue or outbound integration
    behind it yet. Wiring that up is the Celery item on the roadmap; until then
    the module is honest that a run is a logged execution, not a delivered one.
    """
    pool = await get_pool()
    row = await pool.fetchrow(
        "UPDATE automations SET runs = runs + 1, last_run_at = now() "
        "WHERE id = $1 AND username = $2 AND enabled "
        "RETURNING id, name, trigger, action, enabled, runs, created_at, last_run_at",
        automation_id, user["username"],
    )
    if not row:
        raise HTTPException(status_code=404, detail="Automation not found, or it is disabled")
    await _log(pool, user["username"], "automation", "run", row["name"])
    return _automation_row(row)


@router.delete("/automations/{automation_id}", status_code=204)
async def delete_automation(automation_id: int = AutomationId, user=Depends(get_current_user)):
    pool = await get_pool()
    result = await pool.execute(
        "DELETE FROM automations WHERE id = $1 AND username = $2",
        automation_id, user["username"],
    )
    if result.endswith("0"):
        raise HTTPException(status_code=404, detail="Automation not found")


def _automation_row(r) -> Automation:
    return Automation(
        id=r["id"], name=r["name"], trigger=r["trigger"], action=r["action"],
        enabled=r["enabled"], runs=r["runs"],
        created_at=r["created_at"].isoformat(),
        last_run_at=r["last_run_at"].isoformat() if r["last_run_at"] else None,
    )


# --------------------------------------------------------------------------
# Activity events + the dashboard trend
# --------------------------------------------------------------------------
class EventIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    module: str = Field(..., min_length=1, max_length=60)
    action: str = Field(..., min_length=1, max_length=60)
    detail: str | None = Field(None, max_length=400)


class Event(EventIn):
    id: int
    username: str
    created_at: str


async def _log(pool, username: str, module: str, action: str, detail: str | None) -> None:
    await pool.execute(
        "INSERT INTO activity_events (username, module, action, detail) VALUES ($1, $2, $3, $4)",
        username, module, action, detail,
    )


@router.post("/events", response_model=Event, status_code=201)
async def create_event(body: EventIn, user=Depends(get_current_user)):
    pool = await get_pool()
    row = await pool.fetchrow(
        "INSERT INTO activity_events (username, module, action, detail) "
        "VALUES ($1, $2, $3, $4) RETURNING id, username, module, action, detail, created_at",
        user["username"], body.module, body.action, body.detail,
    )
    return Event(id=row["id"], username=row["username"], module=row["module"],
                 action=row["action"], detail=row["detail"],
                 created_at=row["created_at"].isoformat())


@router.get("/events", response_model=list[Event])
async def list_events(limit: int = Query(50, ge=1, le=200), user=Depends(get_current_user)):
    pool = await get_pool()
    rows = await pool.fetch(
        "SELECT id, username, module, action, detail, created_at FROM activity_events "
        "WHERE username = $1 ORDER BY created_at DESC LIMIT $2",
        user["username"], min(limit, 200),
    )
    return [Event(id=r["id"], username=r["username"], module=r["module"], action=r["action"],
                  detail=r["detail"], created_at=r["created_at"].isoformat()) for r in rows]


class AuditEvent(Event):
    """Same shape as Event, but returned across all users — admin only."""


@router.get("/audit", response_model=list[AuditEvent])
async def audit_log(limit: int = Query(100, ge=1, le=500), admin=Depends(require_admin)):
    """
    Platform-wide audit log.

    This is the one place the two roles genuinely diverge, and it is enforced
    here rather than in the UI. `/events` is scoped to the caller; this returns
    every user's activity and is gated by require_admin, so an Analyst holding
    a valid token gets 403 from the API — hiding the nav item is presentation,
    not protection, and on its own would have been security theatre.
    """
    pool = await get_pool()
    rows = await pool.fetch(
        "SELECT id, username, module, action, detail, created_at FROM activity_events "
        "ORDER BY created_at DESC LIMIT $1",
        min(limit, 500),
    )
    return [AuditEvent(id=r["id"], username=r["username"], module=r["module"], action=r["action"],
                       detail=r["detail"], created_at=r["created_at"].isoformat()) for r in rows]


class TrendPoint(BaseModel):
    d: str
    v: int


@router.get("/trend", response_model=list[TrendPoint])
async def activity_trend(days: int = 14, user=Depends(get_current_user)):
    """
    Daily event counts for the dashboard chart.

    Days with no activity are returned as zeroes rather than omitted — a
    gap-free series is what keeps the x-axis honest. A brand-new install will
    therefore show a mostly-flat line, which is the correct depiction of a
    system nobody has used yet, and the reason the old hardcoded array looked
    more impressive than reality.
    """
    days = max(1, min(days, 90))
    pool = await get_pool()
    rows = await pool.fetch(
        "SELECT created_at::date AS day, COUNT(*) AS n FROM activity_events "
        "WHERE username = $1 AND created_at >= now() - ($2 || ' days')::interval "
        "GROUP BY day ORDER BY day",
        user["username"], str(days),
    )
    counts = {r["day"]: r["n"] for r in rows}
    today = date.today()
    return [
        TrendPoint(d=(today - timedelta(days=i)).isoformat(), v=counts.get(today - timedelta(days=i), 0))
        for i in range(days - 1, -1, -1)
    ]
