import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from app.models.schemas import ScanRequest, ScanResponse, FeatureWeight
from app.agent.threat_agent import analyze
from app.storage.incident_store import save_incident

router = APIRouter()

VALID_INPUT_TYPES = {"email", "url", "prompt", "login_log", "ai_text"}


@router.post("/scan", response_model=ScanResponse)
async def scan_threat(request: ScanRequest):
    if not request.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    if request.input_type not in VALID_INPUT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"input_type must be one of: {', '.join(VALID_INPUT_TYPES)}"
        )

    scan_id = str(uuid.uuid4())
    timestamp = datetime.now().isoformat()

    result = await analyze(request.input_type, request.content)

    response = ScanResponse(
        scan_id=scan_id,
        input_type=request.input_type,
        threat_type=result.get("threat_type", "Unknown"),
        verdict=result.get("verdict", "SAFE"),
        risk_score=float(result.get("risk_score", 0)),
        confidence=float(result.get("confidence", 50)),
        explanation=result.get("explanation", "No explanation available."),
        signals=result.get("signals", []),
        feature_weights=[FeatureWeight(**fw) for fw in result.get("feature_weights", [])],
        recommendations=result.get("recommendations", []),
        highlighted_segments=result.get("highlighted_segments", []),
        timestamp=timestamp
    )

    save_incident({
        **response.model_dump(),
        "content_preview": request.content[:120] + ("..." if len(request.content) > 120 else ""),
        "feature_weights": result.get("feature_weights", []),
    })

    return response
