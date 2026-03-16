import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException
from app.models.schemas import ScanRequest, ScanResponse, FeatureWeight, ModuleResult
from app.agent.threat_agent import analyze
from app.storage.incident_store import save_incident

router = APIRouter()

VALID_INPUT_TYPES = {"email", "url", "prompt", "login_log", "ai_text"}


@router.post(
    "/scan",
    response_model=ScanResponse,
    summary="Analyze a threat input",
    description="""
Submit any of the following input types for multi-threat analysis:

- **email** — Paste a suspicious email or message body
- **url** — A URL to analyze for malicious indicators
- **prompt** — An AI prompt to check for injection attacks
- **login_log** — A JSON array of login events for anomaly detection
- **ai_text** — A block of text to check for AI generation

The fusion engine automatically detects when multiple threat types
are present in a single input and returns a compound threat assessment.
    """,
)
async def scan_threat(request: ScanRequest):

    if not request.content.strip():
        raise HTTPException(
            status_code=400,
            detail="Content cannot be empty"
        )

    if request.input_type not in VALID_INPUT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"input_type must be one of: {', '.join(sorted(VALID_INPUT_TYPES))}"
        )

    scan_id = str(uuid.uuid4())
    timestamp = datetime.now().isoformat()

    result = await analyze(request.input_type, request.content)

    raw_detector_results = result.get("detector_results", [])
    detector_results = []
    for dr in raw_detector_results:
        try:
            detector_results.append(ModuleResult(
                threat_type=dr.get("threat_type", "Unknown"),
                risk_score=float(dr.get("risk_score", 0)),
                confidence=float(dr.get("confidence", 50)),
                signals=dr.get("signals", []),
            ))
        except Exception:
            continue

    response = ScanResponse(
        scan_id=scan_id,
        input_type=request.input_type,
        threat_type=result.get("threat_type", "Unknown"),
        verdict=result.get("verdict", "SAFE"),
        risk_score=float(result.get("risk_score", 0)),
        confidence=float(result.get("confidence", 50)),
        explanation=result.get("explanation", "No explanation available."),
        signals=result.get("signals", []),
        feature_weights=[
            FeatureWeight(**fw)
            for fw in result.get("feature_weights", [])
            if isinstance(fw, dict) and "feature" in fw and "weight" in fw
        ],
        recommendations=result.get("recommendations", []),
        highlighted_segments=result.get("highlighted_segments", []),
        fusion_score=float(result.get("fusion_score", 0)),
        fusion_verdict=result.get("fusion_verdict", "SAFE"),
        threats_detected=result.get("threats_detected", []),
        per_module_scores=result.get("per_module_scores", {}),
        is_compound_threat=bool(result.get("is_compound_threat", False)),
        compound_threat_label=result.get("compound_threat_label", ""),
        modules_triggered=int(result.get("modules_triggered", 0)),
        detector_results=detector_results,
        timestamp=timestamp,
    )

    save_incident({
        **response.model_dump(),
        "content_preview": request.content[:120] + (
            "..." if len(request.content) > 120 else ""
        ),
    })

    return response