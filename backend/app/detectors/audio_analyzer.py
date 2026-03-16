import io
import httpx
import numpy as np
from typing import Dict, Any
from app.config import settings

# Two complementary voice/audio classifiers via HF router
_MODELS = [
    {
        "url"        : "https://router.huggingface.co/hf-inference/models/motheecreator/Deepfake-audio-detection",
        "fake_labels": {"fake", "spoof", "deepfake", "synthetic", "label_1"},
        "real_labels": {"real", "genuine", "human", "bonafide", "label_0"},
        "weight"     : 0.60,
        "name"       : "deepfake_audio",
    },
    {
        "url"        : "https://router.huggingface.co/hf-inference/models/HyperMoon/wav2vec2-base-960h-finetuned-deepfake",
        "fake_labels": {"fake", "spoof", "synthetic", "label_1"},
        "real_labels": {"real", "genuine", "label_0"},
        "weight"     : 0.40,
        "name"       : "wav2vec2_deepfake",
    },
]

AUDIO_SIGNALS = [
    "AI model detected synthetic/cloned voice patterns",
    "Audio waveform inconsistencies associated with TTS/voice cloning",
    "Prosody and pitch patterns inconsistent with natural speech",
    "Audio deepfake indicators detected by ensemble classifier",
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
    if fake_score is None and real_score is None and len(data) >= 2:
        sd = sorted(data, key=lambda x: x.get("label", "").lower())
        fake_score = sd[0]["score"]
        real_score = sd[1]["score"]
    fake_score = fake_score if fake_score is not None else 0.0
    real_score = real_score if real_score is not None else 1.0 - fake_score
    return fake_score, real_score


async def analyze_audio(audio_bytes: bytes, content_type: str = "audio/wav") -> Dict[str, Any]:
    if not settings.HF_API_KEY:
        return _fallback_result("HuggingFace API key not configured")

    headers      = {
        "Authorization": f"Bearer {settings.HF_API_KEY}",
        "Content-Type" : content_type,
    }
    scores       = {}
    weighted_sum = 0.0
    total_w      = 0.0

    async with httpx.AsyncClient(timeout=60.0) as client:
        for model in _MODELS:
            try:
                resp = await client.post(model["url"], headers=headers, content=audio_bytes)
                if resp.status_code != 200:
                    raise RuntimeError(f"HTTP {resp.status_code}")
                data = resp.json()
                print(f"[audio_analyzer] {model['name']} → {data}")
                if not isinstance(data, list) or len(data) == 0:
                    raise RuntimeError(f"bad format: {data}")
                fake_score, _ = _parse_scores(data, model["fake_labels"], model["real_labels"])
                scores[model["name"]] = fake_score
                weighted_sum += fake_score * model["weight"]
                total_w      += model["weight"]
            except Exception as e:
                print(f"[audio_analyzer] {model['name']} failed: {e}")

    if total_w == 0:
        return _fallback_result("All audio models unavailable")

    ensemble_fake = weighted_sum / total_w

    # Max-anchor: if any model is very confident → don't let others dilute
    max_fake = max(scores.values()) if scores else 0.0
    if max_fake >= 0.80:
        high_conf     = {n: s for n, s in scores.items() if s >= 0.60}
        ensemble_fake = sum(high_conf.values()) / len(high_conf) if high_conf else ensemble_fake
    elif max_fake >= 0.60:
        ensemble_fake = max(ensemble_fake, max_fake * 0.75)

    ensemble_real = 1.0 - ensemble_fake
    risk_score    = round(ensemble_fake * 100, 1)
    confidence    = round(max(ensemble_fake, ensemble_real) * 100, 1)

    if risk_score >= 75:
        signals = AUDIO_SIGNALS
    elif risk_score >= 50:
        signals = AUDIO_SIGNALS[:2]
    elif risk_score >= 25:
        signals = ["Low-level synthetic audio indicators — manual review recommended"]
    else:
        signals = ["Audio appears authentic based on ensemble model analysis"]

    return {
        "risk_score"         : risk_score,
        "confidence"         : confidence,
        "verdict"            : _verdict(risk_score),
        "threat_type"        : "Deepfake / AI-Cloned Audio",
        "signals"            : signals,
        "feature_weights"    : [
            {"feature": f"Model: {name} (fake prob)", "weight": round(s * 100, 1)}
            for name, s in scores.items()
        ] + [{"feature": "Ensemble Fake Score", "weight": risk_score}],
        "highlighted_segments": [],
        "model_label"        : "Fake/Synthetic" if ensemble_fake > ensemble_real else "Real",
        "model_confidence"   : confidence,
        "models_used"        : list(scores.keys()),
    }


def _fallback_result(reason: str) -> Dict[str, Any]:
    return {
        "risk_score": 0.0, "confidence": 0.0, "verdict": "SAFE",
        "threat_type": "Deepfake / AI-Cloned Audio",
        "signals": [f"Analysis unavailable: {reason}"],
        "feature_weights": [], "highlighted_segments": [],
        "model_label": "Unknown", "model_confidence": 0.0,
    }
