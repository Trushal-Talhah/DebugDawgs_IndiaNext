import uuid
from datetime import datetime
import asyncio

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.schemas import ScanResponse, FeatureWeight, ModuleResult
from app.agent.threat_agent import analyze
from app.storage.incident_store import save_incident
from app.services.input_classifier import classify_input
from app.agent.fusion_engine import compute_fusion
import os
from app.detectors.mitre_classifier import map_to_mitre
from app.services.mitre_predictor import MITREMarkovChain

_chain = MITREMarkovChain()
_weights_path = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    '../../../data/mitre_weights.json'
)
try:
    _chain.load(_weights_path)
    print("MITRE prediction engine ready")
except Exception as e:
    print(f"MITRE weights not loaded: {e}")

# ── Raw detector imports (zero LLM calls) ────────────────────────────────────
from app.detectors.url_analyzer import (
    extract_url_features, compute_url_risk_score, get_url_highlights, compute_url_confidence
)
from app.detectors.phishing_detector import (
    extract_phishing_features, compute_phishing_risk, get_phishing_signals, compute_confidence
)
from app.detectors.prompt_injection_detector import detect_prompt_injection
from app.detectors.anomaly_detector import detect as detect_anomaly

router = APIRouter()

VALID_INPUT_TYPES = {"email", "url", "prompt", "login_log", "ai_text"}

# Secondary detectors per primary type — these use ZERO LLM calls
SECONDARY_DETECTORS: dict[str, list[str]] = {
    "email":     ["url", "prompt"],   # check if email contains malicious URL or injection
    "url":       ["email"],           # check if URL context is phishing
    "prompt":    [],                  # prompt injection is self-contained
    "ai_text":   [],                  # AI content is self-contained
    "login_log": [],                  # anomaly is self-contained
}


# ── Raw detector dispatcher — NO LLM, NO API calls ───────────────────────────

def _run_raw_detector(detector_type: str, content: str) -> dict | None:
    """
    Runs detector logic directly using pure Python functions.
    Zero API calls — used only for secondary/fusion detectors.
    Returns None if score is too low to matter (< 15).
    """
    try:
        if detector_type == "url":
            # Only worth running if content actually contains a URL
            import re
            if not re.search(r'https?://', content):
                return None
            # Extract first URL found
            url_match = re.search(r'https?://\S+', content)
            url = url_match.group(0) if url_match else content.strip()
            features = extract_url_features(url)
            risk_score, attributions, signals = compute_url_risk_score(features)
            if risk_score < 15:
                return None
            return {
                "threat_type": "Malicious URL",
                "risk_score": round(risk_score, 1),
                "confidence": compute_url_confidence(signals, risk_score),
                "signals": signals,
                "feature_weights": attributions,
            }

        elif detector_type == "email":
            features = extract_phishing_features(content)
            risk_score, attributions = compute_phishing_risk(features)
            if risk_score < 15:
                return None
            signals = get_phishing_signals(features)
            return {
                "threat_type": "Phishing Email / Message",
                "risk_score": round(risk_score, 1),
                "confidence": compute_confidence(signals, risk_score),
                "signals": signals,
                "feature_weights": attributions,
            }

        elif detector_type == "prompt":
            result = detect_prompt_injection(content)
            if float(result.get("risk_score", 0)) < 15:
                return None
            return {
                "threat_type": "Prompt Injection Attack",
                "risk_score": result["risk_score"],
                "confidence": result["confidence"],
                "signals": result["signals"],
                "feature_weights": result["matched_patterns"],
            }

    except Exception:
        return None

    return None


# ── Request schemas ──────────────────────────────────────────────────────────

class ScanRequest(BaseModel):
    content: str
    input_type: str


class AutoScanRequest(BaseModel):
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

    # ── Step 1: Primary detector — full LangChain agent (LLM explanation) ───
    primary_result = await analyze(input_type, content)

    # ── Step 2: Secondary detectors — raw Python, ZERO API calls ────────────
    all_detector_results = [primary_result]

    if run_fusion:
        secondary_types = SECONDARY_DETECTORS.get(input_type, [])
        # Run all secondary detectors in parallel (they're sync, wrap in executor)
        loop = asyncio.get_event_loop()
        secondary_results = await asyncio.gather(*[
            loop.run_in_executor(None, _run_raw_detector, sec_type, content)
            for sec_type in secondary_types
        ])
        # Only add results that actually fired
        all_detector_results += [r for r in secondary_results if r is not None]

    # ── Step 3: Fusion engine — pure Python, zero API calls ─────────────────
    fusion = compute_fusion(all_detector_results)

    # ── Step 4: Build ModuleResult list ─────────────────────────────────────
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

    # ── Step 5: Build response ───────────────────────────────────────────────
    response = ScanResponse(
        scan_id=scan_id,
        input_type=input_type,
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
        fusion_score=fusion["fusion_score"],
        fusion_verdict=fusion["fusion_verdict"],
        threats_detected=fusion["threats_detected"],
        per_module_scores=fusion["per_module_scores"],
        is_compound_threat=fusion["is_compound_threat"],
        compound_threat_label=fusion["compound_threat_label"],
        modules_triggered=fusion["modules_triggered"],
        detector_results=detector_results,
        timestamp=timestamp,
    )

    # ── Step 5b: MITRE ATT&CK Prediction ────────────────────────────
    try:
        mitre_data = map_to_mitre(primary_result.get("threat_type", ""))
        predictions = _chain.predict(mitre_data["tactic"], top_n=3)
        response.mitre_tactic = mitre_data["tactic"]
        response.mitre_stage = mitre_data["stage"]
        response.mitre_predictions = predictions
        response.mitre_source = {
            "method": "First-order Markov Chain",
            "data_source": "MITRE ATT&CK Enterprise CTI Dataset",
            "campaigns_analysed": _chain.total_campaigns,
            "methodology_citation": "Sheyner et al. — Automated Generation and Analysis of Attack Graphs, IEEE S&P 2002",
            "validation": "Wilson Score 95% Confidence Intervals + Chi-square significance testing",
            "data_url": "https://github.com/mitre/cti",
            "framework_url": "https://attack.mitre.org",
            "note": "Probabilities derived from real documented APT campaign sequences. No hardcoded rules."
        }
    except Exception:
        pass

    # ── Step 6: Save incident ────────────────────────────────────────────────
    incident_data = {
        **response.model_dump(),
        "content_preview": content[:120] + ("..." if len(content) > 120 else ""),
    }
    if classifier_meta:
        incident_data["classifier_meta"] = classifier_meta

    save_incident(incident_data)
    return response


# ── Route 1: Auto-detect ─────────────────────────────────────────────────────

@router.post(
    "/scan",
    response_model=ScanResponse,
    summary="Auto-classify and analyze any threat input",
    description="""
Submit **any string** — no input type needed.

**NVIDIA NIM (LLaMA 3.1)** classifies input type, routes to the primary detector
(full LLM explanation), then runs secondary detectors using **pure Python — zero
extra API calls** — before fusing all results for compound threat detection.
""",
)
async def auto_scan(request: AutoScanRequest):
    if not request.input.strip():
        raise HTTPException(status_code=400, detail="Input cannot be empty.")

    classification = await classify_input(request.input)
    input_type     = classification["input_type"]

    return await _run_scan(
        input_type=input_type,
        content=request.input,
        run_fusion=True,
        classifier_meta=classification,
    )


# ── Route 2: Legacy typed ────────────────────────────────────────────────────

@router.post(
    "/scan/typed",
    response_model=ScanResponse,
    summary="[Legacy] Analyze with explicit input_type",
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
