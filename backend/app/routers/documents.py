import base64
import json

import anthropic
from fastapi import APIRouter, File, HTTPException, UploadFile, Form

from app.config import settings
from app.schemas import (
    DocumentAnalysis, DocumentTextRequest, DocumentQuestionRequest, DocumentQuestionResponse,
)

router = APIRouter()
client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

ANALYSIS_INSTRUCTION = (
    "Analyze this document. Reply with JSON only, keys: summary "
    "(2-3 sentence paragraph), key_points (array of 3-5 short strings). "
    "Nothing outside the JSON."
)


def _parse_json_response(raw: str) -> dict:
    cleaned = raw.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {"summary": cleaned, "key_points": []}


@router.post("/analyze-text", response_model=DocumentAnalysis)
def analyze_text(req: DocumentTextRequest):
    response = client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=600,
        system="You are a precise document analysis engine. Output valid JSON only, no markdown fences.",
        messages=[{"role": "user", "content": f"{ANALYSIS_INSTRUCTION}\n\nDocument text:\n{req.text}"}],
    )
    text = next((b.text for b in response.content if b.type == "text"), "")
    parsed = _parse_json_response(text)
    return DocumentAnalysis(**parsed)


@router.post("/analyze-image", response_model=DocumentAnalysis)
async def analyze_image(file: UploadFile = File(...)):
    if file.content_type not in ("image/png", "image/jpeg", "image/webp"):
        raise HTTPException(status_code=400, detail="Upload a PNG, JPEG, or WEBP image.")
    raw_bytes = await file.read()
    if len(raw_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image exceeds 5MB limit.")
    b64 = base64.b64encode(raw_bytes).decode("utf-8")

    response = client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=600,
        system="You are a precise document analysis engine. Output valid JSON only, no markdown fences.",
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": file.content_type, "data": b64}},
                {"type": "text", "text": ANALYSIS_INSTRUCTION},
            ],
        }],
    )
    text = next((b.text for b in response.content if b.type == "text"), "")
    parsed = _parse_json_response(text)
    return DocumentAnalysis(**parsed)


@router.post("/ask", response_model=DocumentQuestionResponse)
def ask_about_document(req: DocumentQuestionRequest):
    response = client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=400,
        system="Answer briefly and only from the provided document.",
        messages=[{"role": "user", "content": f"Document:\n{req.document_text}\n\nQuestion: {req.question}"}],
    )
    text = next((b.text for b in response.content if b.type == "text"), "")
    return DocumentQuestionResponse(answer=text)
