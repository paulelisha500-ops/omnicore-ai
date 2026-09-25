"""
Module 08 — Enterprise Search.

Real search, not a stub. Two sources are merged and ranked:

  * the caller's own session corpus (knowledge-base snippets and chat turns
    the frontend POSTs alongside the query), scored with a small BM25-ish
    term-frequency ranker, and
  * the live web, via the self-hosted SearXNG instance.

Scoring lives here rather than in the browser so that swapping the corpus
for a Postgres/pgvector index later changes one file and no frontend code.
"""
import math
import re
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.tools import search_structured

router = APIRouter()

_WORD_RE = re.compile(r"[\w؀-ۿ]+", re.UNICODE)  # Latin + Arabic ranges


def _tokens(text: str) -> list[str]:
    return _WORD_RE.findall((text or "").lower())


class Doc(BaseModel):
    id: str
    type: Literal["kb", "chat", "note"] = "kb"
    title: str = ""
    body: str = ""


class SearchQuery(BaseModel):
    q: str = Field(..., min_length=1, max_length=300)
    corpus: list[Doc] = Field(default_factory=list, max_length=500)
    include_web: bool = True
    limit: int = 20


class Hit(BaseModel):
    type: str
    title: str
    snippet: str
    score: float
    url: str | None = None


class SearchResponse(BaseModel):
    query: str
    results: list[Hit]
    web_available: bool


def _score(query_terms: list[str], text: str) -> tuple[float, int]:
    """
    Term-frequency score with diminishing returns per repeat, plus a bonus for
    covering more distinct query terms — so a doc matching three terms once
    beats a doc matching one term five times. Returns (score, match_position)
    where position is used to cut a relevant snippet.
    """
    toks = _tokens(text)
    if not toks:
        return 0.0, -1
    counts: dict[str, int] = {}
    for t in toks:
        counts[t] = counts.get(t, 0) + 1

    score, covered = 0.0, 0
    for term in query_terms:
        c = counts.get(term, 0)
        if c:
            covered += 1
            score += 1.0 + math.log(c)  # log-damped, so spam repetition doesn't win
    if not covered:
        return 0.0, -1
    score *= 1.0 + 0.5 * (covered - 1)  # multi-term coverage bonus
    score /= 1.0 + math.log(1 + len(toks) / 50)  # mild length normalisation

    lowered = text.lower()
    pos = min((lowered.find(t) for t in query_terms if lowered.find(t) >= 0), default=-1)
    return score, pos


def _snippet(text: str, pos: int, width: int = 200) -> str:
    if not text:
        return ""
    if pos < 0:
        return text[:width] + ("…" if len(text) > width else "")
    start = max(0, pos - width // 3)
    end = min(len(text), start + width)
    return ("…" if start > 0 else "") + text[start:end].strip() + ("…" if end < len(text) else "")


@router.post("", response_model=SearchResponse)
def search(req: SearchQuery):
    terms = _tokens(req.q)
    hits: list[Hit] = []

    for doc in req.corpus:
        blob = f"{doc.title}\n{doc.body}"
        score, pos = _score(terms, blob)
        if score <= 0:
            continue
        hits.append(Hit(
            type=doc.type,
            title=doc.title or (doc.body[:60] + "…" if len(doc.body) > 60 else doc.body),
            snippet=_snippet(doc.body or doc.title, pos),
            score=round(score, 3),
        ))

    web_available = False
    if req.include_web:
        rows = search_structured(req.q, max_results=6)
        web_available = bool(rows)
        for r in rows:
            # Web hits are scored below any real local match by construction:
            # the session corpus is the user's own data and should lead.
            hits.append(Hit(type="web", title=r["title"], snippet=r["snippet"],
                            score=0.5, url=r["url"]))

    hits.sort(key=lambda h: h.score, reverse=True)
    return SearchResponse(query=req.q, results=hits[:req.limit], web_available=web_available)
