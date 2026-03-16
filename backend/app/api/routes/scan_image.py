import uuid
import io
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException
from PIL import Image
from app.models.schemas import DeepfakeScanResponse, FeatureWeight
from app.detectors import deepfake_detector
from app.llm.groq_client import get_llm
from app.llm.prompts import DEEPFAKE_EXPLANATION_PROMPT
from app.storage.incident_store import save_incident
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

router = APIRouter()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_MB = 5


@router.post("/scan/image", response_model=DeepfakeScanResponse)
async def scan_image(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WEBP, GIF images are accepted")

    image_bytes = await file.read()

    if len(image_bytes) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"Image must be under {MAX_SIZE_MB}MB")

    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or corrupted image file")

    scan_id = str(uuid.uuid4())
    timestamp = datetime.now().isoformat()

    result = await deepfake_detector.detect(image_bytes)

    try:
        chain = (
            ChatPromptTemplate.from_template(DEEPFAKE_EXPLANATION_PROMPT)
            | get_llm(temperature=0.2)
            | StrOutputParser()
        )
        explanation = await chain.ainvoke({
            "model_label": result.get("model_label", "Unknown"),
            "model_confidence": result.get("model_confidence", 0),
            "risk_score": result.get("risk_score", 0)
        })
    except Exception:
        explanation = (
            f"Deepfake analysis completed. The image was classified as "
            f"'{result.get('model_label', 'Unknown')}' with "
            f"{result.get('confidence', 0)}% confidence."
        )

    recommendations = {
        "HIGH": [
            "Do not use this image for identity verification or authentication.",
            "Report this image to the platform where you received it.",
            "Conduct a reverse image search to identify the original source."
        ],
        "MEDIUM": [
            "Treat this image with caution — request alternative verification.",
            "Cross-check the identity through a live video call if possible.",
            "Document and report suspected deepfake content to your security team."
        ],
        "LOW": ["No immediate action required, but verify identity through other means if critical.",
                "Monitor for follow-up suspicious content from the same source.",
                "Keep this image flagged for future reference."],
        "SAFE": ["Image appears authentic based on analysis.",
                 "Continue following standard media verification practices.",
                 "Be cautious if context seems suspicious despite safe classification."]
    }.get(result.get("verdict", "SAFE"), [])

    response = DeepfakeScanResponse(
        scan_id=scan_id,
        verdict=result.get("verdict", "SAFE"),
        risk_score=float(result.get("risk_score", 0)),
        confidence=float(result.get("confidence", 0)),
        explanation=explanation,
        signals=result.get("signals", []),
        feature_weights=[FeatureWeight(**fw) for fw in result.get("feature_weights", [])],
        recommendations=recommendations,
        highlighted_segments=[],
        timestamp=timestamp
    )

    save_incident({
        **response.model_dump(),
        "content_preview": f"[Image: {file.filename}]",
        "feature_weights": result.get("feature_weights", []),
    })

    return response
