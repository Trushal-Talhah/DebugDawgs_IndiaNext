from typing import Dict, Any, List, Optional


COMPOUND_THREAT_LABELS = {
    frozenset(["Phishing Email / Message", "Malicious URL"]): "Phishing + Malicious URL",
    frozenset(["Phishing Email / Message", "AI-Generated Malicious Content"]): "AI-Crafted Phishing Attack",
    frozenset(["Phishing Email / Message", "Prompt Injection Attack"]): "Phishing + Prompt Injection",
    frozenset(["Malicious URL", "Prompt Injection Attack"]): "Malicious URL + Injection",
    frozenset(["Phishing Email / Message", "Malicious URL", "AI-Generated Malicious Content"]): "Multi-Vector AI Phishing Attack",
}


def _verdict(score: float) -> str:
    if score >= 75:
        return "HIGH"
    elif score >= 50:
        return "MEDIUM"
    elif score >= 25:
        return "LOW"
    return "SAFE"


def compute_fusion(detector_results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Takes all detector results from a single scan,
    computes a composite score, identifies compound threats,
    and returns a unified fusion summary.
    """

    if not detector_results:
        return {
            "fusion_score": 0.0,
            "fusion_verdict": "SAFE",
            "threats_detected": [],
            "per_module_scores": {},
            "is_compound_threat": False,
            "compound_threat_label": "No Threat Detected",
            "modules_triggered": 0,
        }

    # Build per-module score map
    per_module_scores = {}
    threats_detected = []

    for result in detector_results:
        threat_type = result.get("threat_type", "Unknown")
        risk_score = float(result.get("risk_score", 0))
        per_module_scores[threat_type] = round(risk_score, 1)

        # Only count as a detected threat if above LOW threshold
        if risk_score >= 25:
            threats_detected.append(threat_type)

    # --- Fusion Score Calculation ---
    # Base: take the maximum score across all detectors
    # This ensures the worst finding drives the verdict
    scores = [float(r.get("risk_score", 0)) for r in detector_results]
    max_score = max(scores) if scores else 0.0

    # Compound boost: each additional detector firing above 50
    # adds a small boost to reflect coordinated attack sophistication
    high_hits = sum(1 for s in scores if s >= 50)
    compound_boost = min((high_hits - 1) * 4, 12) if high_hits > 1 else 0

    fusion_score = round(min(max_score + compound_boost, 100), 1)

    # --- Compound Threat Identification ---
    is_compound = len(threats_detected) >= 2
    detected_set = frozenset(threats_detected)

    # Check known compound combinations first
    compound_label = COMPOUND_THREAT_LABELS.get(detected_set)

    # Fallback labels
    if not compound_label:
        if len(threats_detected) >= 3:
            compound_label = "Multi-Vector Attack"
        elif is_compound:
            compound_label = "Compound Threat"
        elif threats_detected:
            compound_label = threats_detected[0]
        else:
            compound_label = "No Threat Detected"

    return {
        "fusion_score": fusion_score,
        "fusion_verdict": _verdict(fusion_score),
        "threats_detected": threats_detected,
        "per_module_scores": per_module_scores,
        "is_compound_threat": is_compound,
        "compound_threat_label": compound_label,
        "modules_triggered": len(threats_detected),
    }