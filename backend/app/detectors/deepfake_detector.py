# backend/app/detectors/deepfake_detector.py
# ── Clean rewrite — no style routing, no anime-specific models, max-boost ensemble ──

import io
import httpx
from typing import Dict, Any, Tuple, List
from app.config import settings

# ── Ensemble — 4 generalist models, rebalanced weights ──────────────────────
#
# Removed: legekka/anime_vit, saltacc/anime_beit
#   → anime_vit=0%, anime_beit=0.3% on Ghibli (actively wrong)
#   → cause false positives on signatures (flat fills scored as anime)
#
# ai_vs_real gets highest weight (0.35) — it's the only model that correctly
# detected Ghibli at 98.9%. It's also the broadest "AI-generated" classifier.
#
_MODELS: List[Dict] = [
    {
        "url"         : "https://router.huggingface.co/hf-inference/models/dima806/ai_vs_real_image_detection",
        "fake_labels" : {"fake", "ai", "label_1"},
        "real_labels" : {"real", "label_0"},
        "weight"      : 0.35,
        "name"        : "ai_vs_real",        # 98.9% on Ghibli — our anchor
    },
    {
        "url"         : "https://router.huggingface.co/hf-inference/models/dima806/ai_vs_human_generated_image_detection",
        "fake_labels" : {"ai-generated", "ai_generated", "artificial", "fake", "label_1"},
        "real_labels" : {"human", "human-generated", "real", "label_0"},
        "weight"      : 0.30,
        "name"        : "ai_vs_human",       # strong on photo-realistic AI
    },
    {
        "url"         : "https://router.huggingface.co/hf-inference/models/dima806/deepfake_vs_real_image_detection",
        "fake_labels" : {"fake", "label_1"},
        "real_labels" : {"real", "label_0"},
        "weight"      : 0.25,
        "name"        : "deepfake_vs_real",  # face swap / GAN deepfakes
    },
    {
        "url"         : "https://router.huggingface.co/hf-inference/models/umm-maybe/AI-image-detector",
        "fake_labels" : {"artificial", "ai", "ai-generated", "generated", "fake", "label_1"},
        "real_labels" : {"human", "real", "label_0"},
        "weight"      : 0.10,
        "name"        : "general_bridge",    # broad crossover model
    },
]

DEEPFAKE_SIGNALS = [
    "AI/deepfake model ensemble classified image as synthetic",
    "Image exhibits AI-generated probability indicators",
    "Potential AI-generated visual manipulation detected",
    "Image inconsistencies associated with generative models",
]


# ── Document / Signature early-exit ─────────────────────────────────────────

def _is_document(image_bytes: bytes) -> bool:
    """
    Returns True for scans, signatures, or documents.
    Heuristic: >65% near-white pixels AND mean saturation < 0.12
    Skips expensive API calls for clearly non-photographic documents.
    """
    try:
        import colorsys
        from PIL import Image
        img    = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        small  = img.resize((128, 128), Image.LANCZOS)
        pixels = list(small.getdata())

        white  = sum(1 for r, g, b in pixels if r > 220 and g > 220 and b > 220)
        w_ratio = white / len(pixels)

        sats   = [colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)[1]
                  for r, g, b in pixels[::4]]
        mean_sat = sum(sats) / len(sats)

        is_doc = w_ratio > 0.65 and mean_sat < 0.12
        print(f"[deepfake] doc_check: white={w_ratio:.2f} sat={mean_sat:.3f} → {'DOCUMENT' if is_doc else 'image'}")
        return is_doc
    except Exception as e:
        print(f"[deepfake] doc_check failed: {e}")
        return False


# ── Helpers ──────────────────────────────────────────────────────────────────

def _verdict(score: float) -> str:
    if score >= 75:   return "HIGH"
    elif score >= 50: return "MEDIUM"
    elif score >= 25: return "LOW"
    return "SAFE"


def _parse_scores(data: list, fake_labels: set, real_labels: set) -> float:
    fake_score = real_score = None
    for entry in data:
        label = entry.get("label", "").lower().strip()
        score = entry.get("score", 0.0)
        if label in fake_labels:
            fake_score = score
        elif label in real_labels:
            real_score = score

    # Alphabetical index fallback when label names are unknown
    if fake_score is None and real_score is None and len(data) >= 2:
        sd         = sorted(data, key=lambda x: x.get("label", "").lower())
        fake_score = sd[0]["score"]

    return fake_score if fake_score is not None else 0.0


async def _query_single(
    client: httpx.AsyncClient,
    model: Dict,
    image_bytes: bytes,
    headers: Dict,
) -> float:
    resp = await client.post(model["url"], headers=headers, content=image_bytes)
    if resp.status_code == 503:
        raise RuntimeError("model loading (503)")
    if resp.status_code != 200:
        raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:120]}")
    data = resp.json()
    if not isinstance(data, list) or len(data) == 0:
        raise RuntimeError(f"unexpected format: {data}")
    fake_score = _parse_scores(data, model["fake_labels"], model["real_labels"])
    print(f"[deepfake] {model['name']:20s} → fake={fake_score:.3f}  raw={data}")
    return fake_score


# ── Main ─────────────────────────────────────────────────────────────────────

async def detect(image_bytes: bytes) -> Dict[str, Any]:
    if not settings.HF_API_KEY:
        return _fallback_result("HuggingFace API key not configured")

    # ── Early exit for documents and signatures ────────────────────────────
    if _is_document(image_bytes):
        return {
            "risk_score"          : 0.0,
            "confidence"          : 95.0,
            "verdict"             : "SAFE",
            "threat_type"         : "Deepfake / AI-Generated Image",
            "signals"             : ["Document, signature, or scan detected — deepfake analysis not applicable"],
            "feature_weights"     : [{"feature": "Document classifier", "weight": 0.0, "status": "skipped"}],
            "highlighted_segments": [],
            "model_label"         : "Document/Scan",
            "model_confidence"    : 95.0,
            "models_used"         : [],
        }

    headers = {
        "Authorization": f"Bearer {settings.HF_API_KEY}",
        "Content-Type" : "image/jpeg",
    }

    # ── Query all models, collect per-model scores ─────────────────────────
    per_model_scores: Dict[str, float] = {}   # model_name → fake_score (0–1)
    w_sum   = 0.0
    total_w = 0.0

    async with httpx.AsyncClient(timeout=40.0) as client:
        for model in _MODELS:
            try:
                fs = await _query_single(client, model, image_bytes, headers)
                per_model_scores[model["name"]] = fs
                w_sum   += fs * model["weight"]
                total_w += model["weight"]
            except Exception as e:
                print(f"[deepfake] {model['name']} failed: {e} — skipping")

    if total_w == 0:
        return _fallback_result("All models unavailable — retry in 30 seconds")

    weighted_avg = w_sum / total_w
    max_score    = max(per_model_scores.values())

    # ── Max-boost aggregation ──────────────────────────────────────────────
    #
    # Problem with pure weighted average:
    #   Ghibli: ai_vs_real=0.989 but 5 other models say ~0 → avg = 7.4% → SAFE (WRONG)
    #
    # Max-boost formula:
    #   final = 0.60 × weighted_avg + 0.40 × max_individual_score
    #
    # Why this works:
    #   Ghibli:      0.60×35.1 + 0.40×98.9 = 21.1 + 39.6 = 60.7% → MEDIUM ✓
    #   Real photo:  0.60×4    + 0.40×6    = 2.4  + 2.4  = 4.8%  → SAFE   ✓
    #   Face fake:   0.60×87   + 0.40×92   = 52.2 + 36.8 = 89%   → HIGH   ✓
    #
    # One confident model can't be silenced, but also can't single-handedly
    # push a score to HIGH — it still needs some corroboration from avg.
    #
    ensemble_fake = 0.60 * weighted_avg + 0.40 * max_score
    ensemble_real = 1.0 - ensemble_fake
    risk_score    = round(ensemble_fake * 100, 1)
    confidence    = round(max(ensemble_fake, ensemble_real) * 100, 1)
    model_label   = "Fake/AI-Generated" if ensemble_fake > 0.5 else "Real"

    # ── Signals ────────────────────────────────────────────────────────────
    top_model = max(per_model_scores, key=per_model_scores.get)
    top_score = round(per_model_scores[top_model] * 100, 1)

    if risk_score >= 75:
        signals = DEEPFAKE_SIGNALS
    elif risk_score >= 50:
        signals = DEEPFAKE_SIGNALS[:2] + [
            f"Strongest signal from {top_model}: {top_score}% AI probability"
        ]
    elif risk_score >= 25:
        signals = [
            "Low-level AI generation indicators detected — manual review recommended",
            f"Highest model confidence: {top_model} at {top_score}%",
        ]
    else:
        signals = [
            "Image appears authentic across all detection models",
            f"Highest model confidence was {top_score}% (below threshold)",
        ]

    # ── Feature weights — actual per-model fake probabilities ──────────────
    feature_weights = [
        {
            "feature": f"{name} (fake probability)",
            "weight" : round(score * 100, 1),
            "status" : "ok",
        }
        for name, score in sorted(
            per_model_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )
    ]
    feature_weights.append({
        "feature": "Ensemble (60% weighted avg + 40% max)",
        "weight" : risk_score,
        "status" : "ensemble",
    })

    return {
        "risk_score"          : risk_score,
        "confidence"          : confidence,
        "verdict"             : _verdict(risk_score),
        "threat_type"         : "Deepfake / AI-Generated Image",
        "signals"             : signals,
        "feature_weights"     : feature_weights,
        "highlighted_segments": [],
        "model_label"         : model_label,
        "model_confidence"    : confidence,
        "models_used"         : list(per_model_scores.keys()),
    }


def _fallback_result(reason: str) -> Dict[str, Any]:
    return {
        "risk_score"          : 0.0,
        "confidence"          : 0.0,
        "verdict"             : "SAFE",
        "threat_type"         : "Deepfake / AI-Generated Image",
        "signals"             : [f"Analysis unavailable: {reason}"],
        "feature_weights"     : [],
        "highlighted_segments": [],
        "model_label"         : "Unknown",
        "model_confidence"    : 0.0,
        "models_used"         : [],
    }
