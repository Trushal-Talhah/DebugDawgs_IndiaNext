import httpx
from typing import Dict, Any
from app.config import settings

# ── 3-model ensemble — each covers different AI generation types ──────────────
# Model 1: dima806 — face deepfakes (trained on face datasets, 99.27% acc)
# Model 2: dima806 ai_vs_human — general AI-generated images (98% acc)
# Model 3: dima806 ai_vs_real — broad AI vs real (98.25% acc)
_MODELS = [
    {
        "url"        : "https://router.huggingface.co/hf-inference/models/dima806/deepfake_vs_real_image_detection",
        "fake_labels": {"fake", "label_1"},
        "real_labels": {"real", "label_0"},
        "weight"     : 0.35,
        "name"       : "deepfake_vs_real",
    },
    {
        "url"        : "https://router.huggingface.co/hf-inference/models/dima806/ai_vs_human_generated_image_detection",
        "fake_labels": {"ai-generated", "ai_generated", "artificial", "fake", "label_1"},
        "real_labels": {"human", "human-generated", "real", "label_0"},
        "weight"     : 0.40,   # highest weight — general AI detection
        "name"       : "ai_vs_human",
    },
    {
        "url"        : "https://router.huggingface.co/hf-inference/models/dima806/ai_vs_real_image_detection",
        "fake_labels": {"fake", "ai", "label_1"},
        "real_labels": {"real", "label_0"},
        "weight"     : 0.25,
        "name"       : "ai_vs_real",
    },
]

DEEPFAKE_SIGNALS = [
    "AI/deepfake model ensemble classified image as synthetic",
    "Image exhibits AI-generated probability indicators",
    "Potential AI-generated manipulation detected",
    "Image inconsistencies associated with generative models"
]


def _verdict(score: float) -> str:
    if score >= 75: return "HIGH"
    elif score >= 50: return "MEDIUM"
    elif score >= 25: return "LOW"
    return "SAFE"


def _parse_scores(data: list, fake_labels: set, real_labels: set) -> tuple:
    fake_score = None
    real_score = None
    for entry in data:
        label = entry.get("label", "").lower().strip()
        score = entry.get("score", 0.0)
        if label in fake_labels:
            fake_score = score
        elif label in real_labels:
            real_score = score
    # Index fallback — alphabetically sorted
    if fake_score is None and real_score is None and len(data) >= 2:
        sd         = sorted(data, key=lambda x: x.get("label", "").lower())
        fake_score = sd[0]["score"]
        real_score = sd[1]["score"]
    fake_score  = fake_score if fake_score is not None else 0.0
    real_score  = real_score if real_score is not None else 1.0 - fake_score
    return fake_score, real_score


async def _query_single(client, model: dict, image_bytes: bytes, headers: dict) -> float:
    """Query one model, returns its fake_score (0.0–1.0). Raises on failure."""
    response = await client.post(model["url"], headers=headers, content=image_bytes)
    if response.status_code == 503:
        raise RuntimeError("loading (503)")
    if response.status_code != 200:
        raise RuntimeError(f"HTTP {response.status_code}")
    data = response.json()
    if not isinstance(data, list) or len(data) == 0:
        raise RuntimeError(f"bad format: {data}")
    fake_score, _ = _parse_scores(data, model["fake_labels"], model["real_labels"])
    print(f"[deepfake_detector] {model['name']} → fake={fake_score:.3f}  raw={data}")
    return fake_score


async def detect(image_bytes: bytes) -> Dict[str, Any]:
    if not settings.HF_API_KEY:
        return _fallback_result("HuggingFace API key not configured")

    headers = {
        "Authorization": f"Bearer {settings.HF_API_KEY}",
        "Content-Type" : "image/jpeg",
    }

    scores      = {}   # model_name → fake_score
    total_w     = 0.0
    weighted_sum = 0.0

    async with httpx.AsyncClient(timeout=40.0) as client:
        for model in _MODELS:
            try:
                fs = await _query_single(client, model, image_bytes, headers)
                scores[model["name"]] = fs
                weighted_sum += fs * model["weight"]
                total_w      += model["weight"]
            except Exception as e:
                print(f"[deepfake_detector] {model['name']} failed: {e} — skipping")

    if total_w == 0:
        return _fallback_result("All models unavailable")

    # Normalise weighted average to available models only
    ensemble_fake  = weighted_sum / total_w
    ensemble_real  = 1.0 - ensemble_fake
    risk_score     = round(ensemble_fake * 100, 1)
    confidence     = round(max(ensemble_fake, ensemble_real) * 100, 1)
    model_label    = "Fake/AI-Generated" if ensemble_fake > ensemble_real else "Real"

    if risk_score >= 75:
        signals = DEEPFAKE_SIGNALS
    elif risk_score >= 50:
        signals = DEEPFAKE_SIGNALS[:2]
    elif risk_score >= 25:
        signals = ["Low-level AI/deepfake indicators — manual review recommended"]
    else:
        signals = ["Image appears authentic based on ensemble model analysis"]

    # Feature weights show per-model contribution
    feature_weights = [
        {"feature": f"Model: {name} (fake prob)", "weight": round(fs * 100, 1)}
        for name, fs in scores.items()
    ]
    feature_weights.append(
        {"feature": "Ensemble Fake Score (weighted)", "weight": risk_score}
    )

    return {
        "risk_score"         : risk_score,
        "confidence"         : confidence,
        "verdict"            : _verdict(risk_score),
        "threat_type"        : "Deepfake / AI-Generated Image",
        "signals"            : signals,
        "feature_weights"    : feature_weights,
        "highlighted_segments": [],
        "model_label"        : model_label,
        "model_confidence"   : confidence,
        "models_used"        : list(scores.keys()),
    }


def _fallback_result(reason: str) -> Dict[str, Any]:
    return {
        "risk_score": 0.0, "confidence": 0.0, "verdict": "SAFE",
        "threat_type": "Deepfake / AI-Generated Image",
        "signals": [f"Analysis unavailable: {reason}"],
        "feature_weights": [], "highlighted_segments": [],
        "model_label": "Unknown", "model_confidence": 0.0,
    }
