import json
import httpx
from typing import Dict, Any, List
from app.config import settings

HF_MODEL_URL = "https://api-inference.huggingface.co/models/prithivMLmods/deepfake-detector-model-v1"

DEEPFAKE_SIGNALS = [
    "AI model classified image as synthetic/fake",
    "Image exhibits deepfake probability indicators",
    "Potential AI-generated facial manipulation detected",
    "Image inconsistencies associated with generative models"
]


def _verdict(score: float) -> str:
    if score >= 75: return "HIGH"
    elif score >= 50: return "MEDIUM"
    elif score >= 25: return "LOW"
    return "SAFE"


async def detect(image_bytes: bytes) -> Dict[str, Any]:
    if not settings.HF_API_KEY:
        return _fallback_result("HuggingFace API key not configured")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                HF_MODEL_URL,
                headers={"Authorization": f"Bearer {settings.HF_API_KEY}"},
                content=image_bytes
            )

        if response.status_code == 503:
            return _fallback_result("Model is loading, please retry in 20 seconds")

        if response.status_code != 200:
            return _fallback_result(f"HF API error: {response.status_code}")

        data = response.json()

        if isinstance(data, list) and len(data) > 0:
            fake_entry = next((d for d in data if "fake" in d["label"].lower()), None)
            real_entry = next((d for d in data if "real" in d["label"].lower()), None)

            fake_score = fake_entry["score"] if fake_entry else 0.0
            real_score = real_entry["score"] if real_entry else 1.0
            model_label = "Fake" if fake_score > real_score else "Real"

            risk_score = round(fake_score * 100, 1)
            confidence = round(max(fake_score, real_score) * 100, 1)

            signals = DEEPFAKE_SIGNALS[:2] if risk_score >= 50 else ["Image appears authentic based on model analysis"]
            feature_weights = [
                {"feature": "Deepfake Model Confidence", "weight": round(fake_score * 100, 1)},
                {"feature": "Authenticity Signal", "weight": round(real_score * 100, 1)}
            ]

            return {
                "risk_score": risk_score,
                "confidence": confidence,
                "verdict": _verdict(risk_score),
                "threat_type": "Deepfake / AI-Generated Image",
                "signals": signals,
                "feature_weights": feature_weights,
                "highlighted_segments": [],
                "model_label": model_label,
                "model_confidence": confidence
            }

        return _fallback_result("Unexpected API response format")

    except httpx.TimeoutException:
        return _fallback_result("HF API request timed out")
    except Exception as e:
        return _fallback_result(str(e))


def _fallback_result(reason: str) -> Dict[str, Any]:
    return {
        "risk_score": 0.0,
        "confidence": 0.0,
        "verdict": "SAFE",
        "threat_type": "Deepfake / AI-Generated Image",
        "signals": [f"Analysis unavailable: {reason}"],
        "feature_weights": [],
        "highlighted_segments": [],
        "model_label": "Unknown",
        "model_confidence": 0.0
    }
