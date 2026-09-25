import re

import httpx
from fastapi import APIRouter, HTTPException

from app.config import settings
from app.schemas import CompletionRequest, CompletionResponse
from app.tools import WEB_SEARCH_TOOL_SCHEMA, web_search

router = APIRouter()

# Some Ollama/model version combinations have shipped <think>...</think>
# reasoning inside message.content even when think=False is requested
# (see ollama/ollama#12610, ollama/ollama-python#576) — this strips it as a
# defensive backstop so a stray reasoning block can never break JSON parsing
# in Document Intelligence / Computer Vision, or just clutter a chat reply.
_THINK_TAG_RE = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)


def _strip_thinking(text: str) -> str:
    return _THINK_TAG_RE.sub("", text).strip()


# ---------------------------------------------------------------------------
# Message translation: the frontend speaks Anthropic's message format (it
# was built against Claude first) — content is either a plain string, or a
# list of content blocks like {"type":"image","source":{...}} / {"type":"text",...}
# for image-bearing messages. Ollama's /api/chat wants plain `content` text
# plus a separate `images` list of bare base64 strings per message. This is
# the one place that difference is absorbed, so nothing upstream needs to
# know which provider is actually serving the request.
# ---------------------------------------------------------------------------
def _split_content(content) -> tuple[str, list[str]]:
    if isinstance(content, str):
        return content, []
    text_parts, images = [], []
    for block in content:
        if block.get("type") == "text":
            text_parts.append(block.get("text", ""))
        elif block.get("type") == "image":
            source = block.get("source", {})
            if source.get("type") == "base64" and source.get("data"):
                images.append(source["data"])
    return "\n".join(text_parts), images


def _has_image(messages) -> bool:
    return any(not isinstance(m.content, str) and _split_content(m.content)[1] for m in messages)


def _ollama_chat(model: str, messages: list[dict], max_tokens: int,
                 tools: list[dict] | None = None, timeout: int = 180) -> dict:
    """One raw call to Ollama's /api/chat. Raises the same exceptions callers already handle."""
    body = {
        "model": model,
        "messages": messages,
        "stream": False,
        "think": False,  # top-level field, NOT inside "options" — Qwen3 auto-enables thinking
                          # on Ollama 0.12+ unless this is set explicitly, which was silently
                          # slowing every response and breaking JSON parsing
        # Ollama unloads an idle model after 5 minutes by default. Reloading
        # qwen3:4b from disk on CPU was measured at ~175s on this stack — i.e.
        # the *first* request after any pause cost nearly three minutes before
        # a single token was generated, which is what made longer answers hit
        # the timeout. Holding the model resident turns that into a one-time
        # cost at startup instead of a recurring per-request one.
        "keep_alive": settings.OLLAMA_KEEP_ALIVE,
        "options": {"num_predict": max_tokens},
    }
    if tools:
        body["tools"] = tools
    resp = httpx.post(
        f"{settings.OLLAMA_BASE_URL}/api/chat",
        json=body,
        timeout=timeout,  # self-hosted CPU inference is far slower than a hosted API
    )
    resp.raise_for_status()
    return resp.json()


def _complete_via_ollama(req: CompletionRequest) -> str:
    has_image = _has_image(req.messages)
    model = settings.OLLAMA_VISION_MODEL if has_image else settings.OLLAMA_TEXT_MODEL
    ollama_messages = [{"role": "system", "content": req.system}]
    for m in req.messages:
        text, images = _split_content(m.content)
        entry = {"role": m.role, "content": text}
        if images:
            entry["images"] = images
        ollama_messages.append(entry)

    # Tool-calling (web search) only makes sense for text requests — vision
    # requests already carry their own content to analyze, and mixing tool
    # calls into a "return JSON only" prompt (Documents/Vision) invites the
    # exact kind of malformed-output problem the think=False fix addressed.
    use_tools = req.enable_tools and not has_image
    tools = [WEB_SEARCH_TOOL_SCHEMA] if use_tools else None

    try:
        data = _ollama_chat(model, ollama_messages, req.max_tokens, tools)
        message = data.get("message", {})
        tool_calls = message.get("tool_calls") or []

        if tool_calls:
            # Real second round-trip: execute the search(es) the model asked
            # for, feed the results back, then ask it to actually answer.
            ollama_messages.append(message)
            for call in tool_calls[:3]:  # cap so a confused model can't loop forever
                fn = call.get("function", {})
                if fn.get("name") == "web_search":
                    query = (fn.get("arguments") or {}).get("query", "")
                    result_text = web_search(query)
                else:
                    result_text = f"Unknown tool '{fn.get('name')}'."
                ollama_messages.append({"role": "tool", "content": result_text})
            data = _ollama_chat(model, ollama_messages, req.max_tokens, tools)
            message = data.get("message", {})

        return _strip_thinking(message.get("content", ""))
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail=f"Can't reach Ollama at {settings.OLLAMA_BASE_URL}. Is it running? If it's on a "
                   f"remote cloud GPU box, check OLLAMA_BASE_URL in .env points at it and its port "
                   f"11434 is reachable from here.",
        )
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(
                status_code=503,
                detail=f"Model '{model}' isn't pulled on the Ollama server yet. Run: "
                       f"docker compose exec ollama ollama pull {model}",
            )
        raise HTTPException(status_code=502, detail=f"Ollama request failed: {e}")
    except httpx.ReadTimeout:
        raise HTTPException(
            status_code=504,
            detail=f"Ollama didn't respond within 180s. CPU inference of '{model}' can be slow, "
                   f"especially the first request after it's been idle (model reload cost), and a "
                   f"web search round-trip adds another full generation on top of that. Try again — "
                   f"it's usually faster once warm. If every request times out, the box may be "
                   f"under-resourced for this model size (Docker Desktop → Settings → Resources).",
        )


def _complete_via_anthropic(req: CompletionRequest) -> str:
    import anthropic  # imported lazily so this dependency is only needed when actually used

    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set. Add it to .env, or "
                   "switch LLM_PROVIDER=ollama to use your self-hosted model instead.",
        )
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    try:
        response = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=req.max_tokens,
            system=req.system,
            messages=[{"role": m.role, "content": m.content} for m in req.messages],
        )
        return next((b.text for b in response.content if b.type == "text"), "")
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"AI request failed: {e}")


@router.post("/complete", response_model=CompletionResponse)
def complete(req: CompletionRequest):
    """
    The one endpoint the frontend's AI modules all call (Chat Assistant,
    Document Intelligence, Computer Vision, Speech summarization, the
    Research Agent, the Dashboard's AI insight). Which model actually
    answers is controlled by LLM_PROVIDER in .env — nothing in the frontend
    or the request shape needs to change either way.

    ollama (default): self-hosted, no per-token cost, routes text requests
    to OLLAMA_TEXT_MODEL and image-bearing requests to OLLAMA_VISION_MODEL.
    When enable_tools=True on a text request, the model can call a real
    web_search tool (backed by self-hosted SearXNG) and gets a genuine
    second round-trip with results before answering — this is what gives
    Chat/the Research Agent actual current information instead of only
    training-time knowledge.
    anthropic: original Claude-backed path, kept as a fallback/comparison.
    Tool-calling isn't wired up on this path yet (Claude has its own native
    web search on Anthropic's side, which is a separate integration).
    """
    if settings.LLM_PROVIDER == "ollama":
        text = _complete_via_ollama(req)
    else:
        text = _complete_via_anthropic(req)
    return CompletionResponse(text=text)
