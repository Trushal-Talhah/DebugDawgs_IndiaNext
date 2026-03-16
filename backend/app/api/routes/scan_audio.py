import uuid
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.models.schemas import DeepfakeScanResponse, FeatureWeight
from app.detectors.audio_analyzer import analyze_audio
from app.storage.incident_store import save_incident

router = APIRouter()

ALLOWED_AUDIO_TYPES = {
    "audio/wav", "audio/x-wav", "audio/mpeg",
    "audio/mp3", "audio/ogg", "audio/flac", "audio/webm"
}
CONTENT_TYPE_MAP = {
    "audio/x-wav"  : "audio/wav",
    "audio/mpeg"   : "audio/mpeg",
    "audio/mp3"    : "audio/mpeg",
    "audio/ogg"    : "audio/ogg",
    "audio/flac"   : "audio/flac",
    "audio/webm"   : "audio/webm",
}
MAX_AUDIO_MB = 20


@router.post(
    "/scan/audio",
    response_model=DeepfakeScanResponse,
    summary="Analyze an audio file for AI voice cloning / deepfake speech",
    description="""
Upload a WAV/MP3/OGG/FLAC audio file (max 20MB).

Detects AI-generated or voice-cloned audio using an ensemble of
speech deepfake classifiers. Useful for detecting synthetic voice
messages, cloned executive voices in vishing attacks, and TTS-generated
social engineering audio.
""",
)
async def scan_audio(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio type: {file.content_type}. "
                   f"Allowed: {', '.join(ALLOWED_AUDIO_TYPES)}"
        )

    audio_bytes = await file.read()
    if len(audio_bytes) > MAX_AUDIO_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Audio exceeds {MAX_AUDIO_MB}MB limit")

    content_type = CONTENT_TYPE_MAP.get(file.content_type, file.content_type)
    result       = await analyze_audio(audio_bytes, content_type)

    def _verdict(s: float) -> str:
        if s >= 75: return "HIGH"
        elif s >= 50: return "MEDIUM"
        elif s >= 25: return "LOW"
        return "SAFE"

    risk_score = result["risk_score"]
    signals    = result["signals"]

    scan_id   = str(uuid.uuid4())
    timestamp = datetime.now().isoformat()

    response = DeepfakeScanResponse(
        scan_id             = scan_id,
        input_type          = "audio",
        threat_type         = result["threat_type"],
        verdict             = result["verdict"],
        risk_score          = risk_score,
        confidence          = result["confidence"],
        explanation         = (
            f"Audio deepfake ensemble analysis complete. "
            f"Risk score: {risk_score}%. "
            f"{'Synthetic/cloned voice detected with high confidence.' if risk_score >= 75 else 'Possible synthetic audio — manual review recommended.' if risk_score >= 25 else 'Audio appears authentic.'}"
        ),
        signals             = signals,
        feature_weights     = [
            FeatureWeight(**fw) for fw in result.get("feature_weights", [])
            if isinstance(fw, dict) and "feature" in fw and "weight" in fw
        ],
        recommendations     = [
            "Do not trust voice instructions in this audio without verification." if risk_score >= 50
            else "Audio appears genuine — apply standard verification practices.",
            "Cross-reference with known authentic recordings of the speaker.",
            "Report suspected voice-cloning attacks to your security team.",
        ],
        highlighted_segments= [],
        timestamp           = timestamp,
    )

    save_incident({
        **response.model_dump(),
        "content_preview": f"Audio: {file.filename} ({len(audio_bytes) // 1024}KB)",
    })

    return response
