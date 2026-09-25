import base64
import json

import anthropic
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import settings
from app.schemas import VisionAnalysis

router = APIRouter()
client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

ANALYSIS_INSTRUCTION = (
    "Analyze this image for an enterprise computer-vision platform. Reply "
    "with JSON only, keys: scene (two-sentence description), objects (array "
    "of the 5-8 most notable objects/elements as short strings), text_found "
    "(any readable text in the image, or empty array), notes (array of 2-3 "
    "professional observations). Nothing outside the JSON."
)


@router.post("/analyze", response_model=VisionAnalysis)
async def analyze_image(file: UploadFile = File(...)):
    """
    Note on scope: this returns free-form scene/object/text understanding via
    Claude's vision, not pixel-level bounding boxes. For bounding-box object
    detection (e.g. counting items in a warehouse camera feed), pair this
    with a dedicated detection model (YOLO/SAM) — see PROJECT_NOTES.md.
    """
    if file.content_type not in ("image/png", "image/jpeg", "image/webp"):
        raise HTTPException(status_code=400, detail="Upload a PNG, JPEG, or WEBP image.")
    raw_bytes = await file.read()
    if len(raw_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image exceeds 5MB limit.")
    b64 = base64.b64encode(raw_bytes).decode("utf-8")

    response = client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=500,
        system="You are a precise computer-vision analysis engine. Output valid JSON only, no markdown fences.",
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": file.content_type, "data": b64}},
                {"type": "text", "text": ANALYSIS_INSTRUCTION},
            ],
        }],
    )
    text = next((b.text for b in response.content if b.type == "text"), "")
    cleaned = text.replace("```json", "").replace("```", "").strip()
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        parsed = {"scene": cleaned, "objects": [], "text_found": [], "notes": []}
    return VisionAnalysis(**parsed)
