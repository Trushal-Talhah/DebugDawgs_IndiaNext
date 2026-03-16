import re
import torch
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple, Any

# ── Model path ────────────────────────────────────────────────────────────────
_BASE       = Path(__file__).resolve().parent.parent.parent / "models" / "phishing_model"

# ── Lazy-loaded model state ───────────────────────────────────────────────────
_tokenizer  = None
_model      = None
_model_ok   = False
_device     = "cuda" if torch.cuda.is_available() else "cpu"


def _load_model() -> bool:
    global _tokenizer, _model, _model_ok
    if _model_ok:
        return True
    try:
        from transformers import DistilBertTokenizerFast, DistilBertForSequenceClassification
        _tokenizer = DistilBertTokenizerFast.from_pretrained(str(_BASE))
        _model     = DistilBertForSequenceClassification.from_pretrained(str(_BASE))
        _model.to(_device)
        _model.eval()
        _model_ok = True
        print(f"[phishing_detector] Model loaded on {_device} ✅")
        return True
    except Exception as e:
        print(f"[phishing_detector] Model load failed — using heuristic fallback. Reason: {e}")
        _model_ok = False
        return False


def _ml_infer(text: str) -> Tuple[float, float]:
    """
    Run DistilBERT inference on text.
    Returns (risk_score_0_100, confidence_0_100).
    Raises on failure so caller can fall back.
    """
    inputs = _tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=512,
        padding=True,
    ).to(_device)

    with torch.no_grad():
        logits = _model(**inputs).logits

    probs      = torch.softmax(logits, dim=-1)[0]
    phishing_p = probs[1].item()   # index 1 = PHISHING
    safe_p     = probs[0].item()   # index 0 = SAFE

    risk_score = round(phishing_p * 100, 1)
    # Confidence = how decisively the model chose — gap between top two classes
    confidence = round(abs(phishing_p - safe_p) * 100, 1)
    return risk_score, confidence


# ── Keyword constants (used by heuristic + explainability) ────────────────────
URGENCY_KEYWORDS = [
    "urgent", "immediately", "asap", "act now", "don't delay", "time sensitive",
    "limited time", "expires", "deadline", "last chance", "final notice",
    "action required", "response required", "immediate action", "within 24 hours",
    "within 48 hours", "respond now", "critical update"
]

FINANCIAL_KEYWORDS = [
    "bank account", "credit card", "debit card", "wire transfer", "bitcoin",
    "cryptocurrency", "paypal", "invoice", "billing", "charges", "refund",
    "reward", "prize", "lottery", "inheritance", "million dollars",
    "unclaimed funds", "cash prize", "gift card", "amazon gift", "payment required"
]

THREAT_KEYWORDS = [
    "suspended", "blocked", "banned", "terminated", "deleted", "deactivated",
    "locked", "unauthorized access", "breach", "compromised", "hacked",
    "security alert", "fraud detected", "suspicious activity", "verify identity",
    "account will be", "legal action", "report to authorities", "law enforcement"
]

PHISHING_PHRASES = [
    "click here", "click the link", "verify your account", "confirm your identity",
    "update your information", "login to your account", "sign in here",
    "enter your password", "provide your details", "complete verification",
    "dear customer", "dear user", "dear account holder", "dear valued",
    "your account has been", "unusual sign-in activity", "we have detected",
    "kindly provide", "we need you to"
]

SUSPICIOUS_DOMAINS = ["bit.ly", "tinyurl", "goo.gl", "ow.ly", ".tk", ".ml", ".ga", ".cf", ".gq"]


# ── Public API — signatures unchanged from tools.py ───────────────────────────

def extract_phishing_features(text: str) -> Dict[str, Any]:
    """
    Extract keyword features + run ML inference if model is available.
    Stores ml_score and ml_confidence in the dict for use by compute_phishing_risk().
    """
    text_lower = text.lower()

    # Always compute keyword features — used for explainability + heuristic fallback
    features: Dict[str, Any] = {
        "urgency_score"      : min(sum(1 for k in URGENCY_KEYWORDS   if k in text_lower) * 15, 45),
        "financial_score"    : min(sum(1 for k in FINANCIAL_KEYWORDS if k in text_lower) * 10, 35),
        "threat_score"       : min(sum(1 for k in THREAT_KEYWORDS    if k in text_lower) * 15, 45),
        "phrase_score"       : min(sum(1 for p in PHISHING_PHRASES   if p in text_lower) * 8,  30),
        "url_density_score"  : min(len(re.findall(r'https?://', text_lower)) * 5, 20),
        "suspicious_url_score": min(sum(1 for d in SUSPICIOUS_DOMAINS if d in text_lower) * 15, 30),
        "exclamation_score"  : min(text.count('!') * 2, 10),
        "caps_score"         : min(int(sum(1 for c in text if c.isupper()) / max(len(text), 1) * 60), 20),
        # ML fields — populated below if model is available
        "ml_score"           : -1.0,
        "ml_confidence"      : -1.0,
    }

    if _load_model():
        try:
            ml_score, ml_conf         = _ml_infer(text)
            features["ml_score"]      = ml_score
            features["ml_confidence"] = ml_conf
        except Exception as e:
            print(f"[phishing_detector] Inference failed — using heuristic. Reason: {e}")

    return features


def compute_phishing_risk(features: Dict[str, Any]) -> Tuple[float, List[Dict]]:
    """
    Primary: use ML score (DistilBERT probability × 100).
    Fallback: keyword score sum.
    Always returns keyword-based feature_weights for explainability.
    """
    # Build keyword attributions for explainability regardless of scoring method
    keyword_keys = [
        "urgency_score", "financial_score", "threat_score", "phrase_score",
        "url_density_score", "suspicious_url_score", "exclamation_score", "caps_score"
    ]
    attributions = [
        {"feature": k.replace("_score", "").replace("_", " ").title(), "weight": features[k]}
        for k in keyword_keys if features.get(k, 0) > 0
    ]
    attributions.sort(key=lambda x: x["weight"], reverse=True)
    total = sum(a["weight"] for a in attributions) or 1.0
    for a in attributions:
        a["weight"] = round(a["weight"] / total * 100, 1)

    ml_score = features.get("ml_score", -1.0)

    if ml_score >= 0:
        # ML is primary — use its score directly
        # Blend only if keyword signals are very strong (compound confirmation)
        keyword_raw = min(sum(features.get(k, 0) for k in keyword_keys), 100)
        if keyword_raw > 60:
            # Both ML + keywords firing — boost slightly
            final_score = round(min(0.75 * ml_score + 0.25 * keyword_raw, 100), 1)
        else:
            final_score = ml_score
        return final_score, attributions[:6]

    # Heuristic fallback
    heuristic_score = min(sum(features.get(k, 0) for k in keyword_keys), 100)
    return heuristic_score, attributions[:6]


def get_phishing_signals(features: Dict[str, Any]) -> List[str]:
    signals = []
    ml_score = features.get("ml_score", -1.0)

    if ml_score >= 0:
        if ml_score >= 75:
            signals.append(f"DistilBERT model flagged as PHISHING (confidence: {features.get('ml_confidence', 0):.1f}%)")
        elif ml_score >= 50:
            signals.append(f"DistilBERT model flagged as likely phishing (score: {ml_score:.1f})")

    if features.get("urgency_score", 0) > 10:
        signals.append("High-urgency language detected")
    if features.get("financial_score", 0) > 10:
        signals.append("Financial request patterns detected")
    if features.get("threat_score", 0) > 10:
        signals.append("Account suspension/threat language found")
    if features.get("phrase_score", 0) > 8:
        signals.append("Classic phishing phrases present")
    if features.get("suspicious_url_score", 0) > 0:
        signals.append("Shortened or suspicious URLs detected")
    if features.get("caps_score", 0) > 10:
        signals.append("Abnormal capitalization pattern")

    return signals


def get_phishing_highlights(text: str) -> List[str]:
    text_lower = text.lower()
    found = [kw for kw in URGENCY_KEYWORDS + THREAT_KEYWORDS + PHISHING_PHRASES if kw in text_lower]
    return list(set(found))[:10]


def compute_confidence(signals: List[str], risk_score: float) -> float:
    ml_conf = None
    # Try to extract ML confidence from signals
    for s in signals:
        if "confidence:" in s:
            try:
                ml_conf = float(s.split("confidence:")[1].replace("%)", "").strip())
            except Exception:
                pass
    if ml_conf is not None:
        return min(ml_conf + len(signals) * 3, 95.0)
    return min(50.0 + len(signals) * 8 + risk_score * 0.1, 95.0)
