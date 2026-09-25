"""
Real web search for the LLM, via the self-hosted SearXNG instance —
no external API key, no per-query cost. This is what "real-time world
information" in the Chat Assistant / Research Agent actually calls.
"""
import time

import httpx

from app.config import settings

WEB_SEARCH_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "web_search",
        "description": "Search the web for current, real-world information — news, prices, "
                        "facts that may have changed recently, or anything not reliably known "
                        "from training alone. Use this whenever the answer depends on the current "
                        "state of the world rather than general knowledge.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "A short, specific search query (2-6 words works best)."}
            },
            "required": ["query"],
        },
    },
}


def web_search(query: str, max_results: int = 5) -> str:
    """Queries SearXNG and returns a compact, LLM-readable text block of results."""
    try:
        resp = httpx.get(
            f"{settings.SEARXNG_URL}/search",
            params={"q": query, "format": "json"},
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        return f"Search failed ({e}). Answer from general knowledge and clearly note it may not be current."

    results = data.get("results", [])[:max_results]
    if not results:
        return f"No search results found for '{query}'. Answer from general knowledge and note the search came up empty."

    lines = [f"Web search results for '{query}':"]
    for i, r in enumerate(results, 1):
        title = r.get("title", "").strip()
        content = (r.get("content") or "").strip()
        url = r.get("url", "")
        lines.append(f"{i}. {title} — {content[:220]}{'…' if len(content) > 220 else ''} ({url})")
    return "\n".join(lines)


def search_structured(query: str, max_results: int = 4, retries: int = 2) -> list[dict]:
    """
    Same SearXNG call as web_search(), but returns rows instead of a text blob.

    The Trade module needs the URL of each hit kept intact so the answer can
    cite it and the reader can open the primary source — a flattened text
    block loses that. Returns [] on failure rather than raising: a dead
    search engine should degrade the answer, not 500 the request.
    """
    # SearXNG can return 200 with zero results when its upstream engines are
    # mid-CAPTCHA or timing out — a transient state, not a real empty result.
    # A couple of backed-off retries recover a useful share of those without
    # hammering the engines further (which is what triggers the block).
    data: dict = {}
    for attempt in range(retries + 1):
        try:
            resp = httpx.get(
                f"{settings.SEARXNG_URL}/search",
                params={"q": query, "format": "json"},
                timeout=25,
            )
            resp.raise_for_status()
            data = resp.json()
            if data.get("results"):
                break
        except Exception:
            data = {}
        if attempt < retries:
            time.sleep(1.5 * (attempt + 1))  # 1.5s, then 3s

    rows: list[dict] = []
    for r in data.get("results", [])[:max_results]:
        url = r.get("url", "")
        if not url:
            continue
        rows.append({
            "title": (r.get("title") or "").strip(),
            "snippet": (r.get("content") or "").strip()[:400],
            "url": url,
        })
    return rows
