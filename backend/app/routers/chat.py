import anthropic
from fastapi import APIRouter, HTTPException

from app.config import settings
from app.schemas import ChatRequest, ChatResponse

router = APIRouter()
client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

SYSTEM_PROMPT = (
    "You are the OmniCore enterprise assistant. Answer concisely and "
    "accurately. If your answer draws on a specific knowledge base snippet, "
    "name it in parentheses at the end of the relevant sentence."
)


@router.post("", response_model=ChatResponse)
def send_message(req: ChatRequest):
    """
    Same contract as the frontend's direct Claude call, moved server-side.
    In production, `knowledge_base_ids` would be resolved here against a
    real vector store and the top-k chunks appended to SYSTEM_PROMPT before
    the request is sent — replacing the frontend's in-memory snippet list
    with a proper retrieval step.
    """
    try:
        response = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=1000,
            system=SYSTEM_PROMPT,
            messages=[{"role": m.role, "content": m.content} for m in req.messages],
        )
        text = next((b.text for b in response.content if b.type == "text"), "")
        return ChatResponse(reply=text)
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"AI request failed: {e}")
