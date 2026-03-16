import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.schemas import ScanResponse, FeatureWeight, ModuleResult
from app.agent.threat_agent import analyze
from app.storage.incident_store import save_incident
from app.services.input_classifier import classify_input
from app.agent.fusion_engine import compute_fusion

router = APIRouter()

VALID_INPUT_TYPES = {"email", "url", "prompt", "login_log", "ai_text"}

# Which secondary detectors to run alongside each primary type
# This enables compound threat detection even in auto-scan mode
SECONDARY_DETECTORS: dict[str, list[str]] = {
    "email":     ["url", "prompt", "ai_text"],   # phishing email may contain malicious URL + AI-crafted content
    "url":       ["email"],                       # malicious URL may also be phishing context
    "prompt":    ["ai_text"],                     # prompt injection may also be AI-generated
    "ai_text":   ["prompt"],                      # AI content may contain injection
    "login_log": [],                              # anomaly is self-contained
}


# ── Request schemas ──────────────────────────────────────────────────────────

class ScanRequest(BaseModel):
    """Legacy — explicit input_type required."""
    content: str
    input_type: str


class AutoScanRequest(BaseModel):
    """New — no input_type needed, NVIDIA NIM classifies automatically."""
    input: str


# ── Core scan runner ─────────────────────────────────────────────────────────

async def _run_scan(
    input_type: str,
    content: str,
    run_fusion: bool = True,
    classifier_meta: dict = None,
) -> ScanResponse:

    scan_id   = str(uuid.uuid4())
    timestamp = datetime.now().isoformat()

    # ── Step 1: Run primary detector ────────────────────────────────
    primary_result = await analyze(input_type, content)

    # ── Step 2: Run secondary detectors for compound threat detection
    all_detector_results = [primary_result]

    if run_fusion:
        secondary_types = SECONDARY_DETECTORS.get(input_type, [])
        for sec_type in secondary_types:
            try:
                sec_result = await analyze(sec_type, content)
                # Only include if it actually fires (risk > 0)
                if float(sec_result.get("risk_score", 0)) > 10:
                    all_detector_results.append(sec_result)
            except Exception:
                continue

    # ── Step 3: Run fusion engine across all detector results ────────
    fusion = compute_fusion(all_detector_results)

    # ── Step 4: Build ModuleResult list ─────────────────────────────
    detector_results = []
    for dr in all_detector_results:
        try:
            detector_results.append(ModuleResult(
                threat_type=dr.get("threat_type", "Unknown"),
                risk_score=float(dr.get("risk_score", 0)),
                confidence=float(dr.get("confidence", 50)),
                signals=dr.get("signals", []),
            ))
        except Exception:
            continue

    # ── Step 5: Build unified response ──────────────────────────────
    response = ScanResponse(
        scan_id=scan_id,
        input_type=input_type,
        # Primary detector fields
        threat_type=primary_result.get("threat_type", "Unknown"),
        verdict=primary_result.get("verdict", "SAFE"),
        risk_score=float(primary_result.get("risk_score", 0)),
        confidence=float(primary_result.get("confidence", 50)),
        explanation=primary_result.get("explanation", "No explanation available."),
        signals=primary_result.get("signals", []),
        feature_weights=[
            FeatureWeight(**fw)
            for fw in primary_result.get("feature_weights", [])
            if isinstance(fw, dict) and "feature" in fw and "weight" in fw
        ],
        recommendations=primary_result.get("recommendations", []),
        highlighted_segments=primary_result.get("highlighted_segments", []),
        # Fusion engine fields
        fusion_score=fusion["fusion_score"],
        fusion_verdict=fusion["fusion_verdict"],
        threats_detected=fusion["threats_detected"],
        per_module_scores=fusion["per_module_scores"],
        is_compound_threat=fusion["is_compound_threat"],
        compound_threat_label=fusion["compound_threat_label"],
        modules_triggered=fusion["modules_triggered"],
        # All detector results
        detector_results=detector_results,
        timestamp=timestamp,
    )

    # ── Step 6: Save incident ────────────────────────────────────────
    incident_data = {
        **response.model_dump(),
        "content_preview": content[:120] + ("..." if len(content) > 120 else ""),
    }
    if classifier_meta:
        incident_data["classifier_meta"] = classifier_meta

    save_incident(incident_data)
    return response


# ── Route 1: NEW — Auto-detect + Fusion ─────────────────────────────────────

@router.post(
    "/scan",
    response_model=ScanResponse,
    summary="Auto-classify and analyze any threat input",
    description="""
Submit **any string** — no input type needed.

**NVIDIA NIM (LLaMA 3.1)** semantically classifies your input, routes it to the
correct primary detector, then automatically runs secondary detectors to catch
**compound/multi-vector threats** via the Fusion Engine.

Supported auto-detected types:
- `url` → Malicious URL analysis
- `email` → Phishing detection
- `prompt` → Prompt injection detection
- `ai_text` → AI-generated content detection
- `login_log` → Anomalous login detection (JSON array)
""",
)
async def auto_scan(request: AutoScanRequest):
    if not request.input.strip():
        raise HTTPException(status_code=400, detail="Input cannot be empty.")

    # NVIDIA NIM classifies the input type
    classification = await classify_input(request.input)
    input_type     = classification["input_type"]

    return await _run_scan(
        input_type=input_type,
        content=request.input,
        run_fusion=True,
        classifier_meta=classification,
    )


# ── Route 2: LEGACY — Explicit input_type ───────────────────────────────────

@router.post(
    "/scan/typed",
    response_model=ScanResponse,
    summary="[Legacy] Analyze with explicit input_type",
    description="Original endpoint — use `/scan` for auto-detection + fusion.",
)
async def scan_typed(request: ScanRequest):
    if not request.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty.")

    if request.input_type not in VALID_INPUT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"input_type must be one of: {', '.join(sorted(VALID_INPUT_TYPES))}"
        )

    return await _run_scan(
        input_type=request.input_type,
        content=request.content,
        run_fusion=True,
    )