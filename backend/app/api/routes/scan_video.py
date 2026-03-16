import uuid
import io
import cv2
import numpy as np
from datetime import datetime
from typing import List

from fastapi import APIRouter, UploadFile, File, HTTPException
from app.models.schemas import DeepfakeScanResponse, FeatureWeight
from app.detectors import deepfake_detector
from app.storage.incident_store import save_incident

router = APIRouter()

ALLOWED_VIDEO_TYPES = {
    "video/mp4", "video/mpeg", "video/quicktime",
    "video/x-msvideo", "video/webm", "video/x-matroska"
}

MAX_VIDEO_MB  = 50
MAX_FRAMES    = 12   # analyse max 12 keyframes — balances accuracy vs latency


def _extract_keyframes(video_bytes: bytes, max_frames: int = MAX_FRAMES) -> List[bytes]:
    """
    Decode video from bytes, extract evenly-spaced keyframes.
    Returns list of JPEG-encoded frame bytes.
    """
    np_arr = np.frombuffer(video_bytes, np.uint8)
    cap    = cv2.VideoCapture()

    # Write to temp buffer OpenCV can read
    import tempfile, os
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    try:
        cap = cv2.VideoCapture(tmp_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames <= 0:
            raise ValueError("Could not read frames from video")

        # Pick evenly-spaced frame indices, skip first/last 5% (usually black)
        start = int(total_frames * 0.05)
        end   = int(total_frames * 0.95)
        indices = np.linspace(start, end, min(max_frames, end - start), dtype=int)

        frames = []
        for idx in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
            ret, frame = cap.read()
            if not ret:
                continue
            _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
            frames.append(buf.tobytes())
        return frames
    finally:
        cap.release()
        os.unlink(tmp_path)


@router.post(
    "/scan/video",
    response_model=DeepfakeScanResponse,
    summary="Analyze a video file for deepfake manipulation",
    description="""
Upload an MP4/AVI/MOV/WEBM video (max 50MB).

The engine extracts up to 12 evenly-spaced keyframes and runs the deepfake
ensemble detector on each. The **worst-case frame score** is used as the
final risk score — one manipulated frame is enough to flag the video.
""",
)
async def scan_video(file: UploadFile = File(...)):
    # ── Validate ──────────────────────────────────────────────────────────────
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported video type: {file.content_type}. "
                   f"Allowed: {', '.join(ALLOWED_VIDEO_TYPES)}"
        )

    video_bytes = await file.read()
    if len(video_bytes) > MAX_VIDEO_MB * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"Video exceeds {MAX_VIDEO_MB}MB limit"
        )

    # ── Extract frames ────────────────────────────────────────────────────────
    try:
        frames = _extract_keyframes(video_bytes)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not decode video: {e}")

    if not frames:
        raise HTTPException(status_code=422, detail="No readable frames found in video")

    # ── Run deepfake detector on each frame ───────────────────────────────────
    frame_results = []
    for i, frame_bytes in enumerate(frames):
        try:
            result = await deepfake_detector.detect(frame_bytes)
            frame_results.append({
                "frame_index": i,
                "risk_score" : result["risk_score"],
                "verdict"    : result["verdict"],
                "model_label": result.get("model_label", "Unknown"),
            })
        except Exception as e:
            print(f"[scan_video] Frame {i} failed: {e}")

    if not frame_results:
        raise HTTPException(status_code=500, detail="All frame analyses failed")

    # ── Aggregate — worst-case frame wins ─────────────────────────────────────
    worst       = max(frame_results, key=lambda x: x["risk_score"])
    avg_score   = round(sum(r["risk_score"] for r in frame_results) / len(frame_results), 1)
    fake_frames = sum(1 for r in frame_results if r["risk_score"] >= 50)
    risk_score  = worst["risk_score"]
    confidence  = round(min(60 + (fake_frames / len(frame_results)) * 40, 95), 1)

    def _verdict(s: float) -> str:
        if s >= 75: return "HIGH"
        elif s >= 50: return "MEDIUM"
        elif s >= 25: return "LOW"
        return "SAFE"

    signals = [
        f"Analysed {len(frame_results)} keyframes — {fake_frames} flagged as fake",
        f"Worst-case frame score: {risk_score}% (frame {worst['frame_index']})",
        f"Average frame score: {avg_score}%",
    ]
    if risk_score >= 75:
        signals.append("High-confidence deepfake video detected")
    elif risk_score >= 50:
        signals.append("Deepfake indicators present in multiple frames")

    feature_weights = [
        FeatureWeight(feature="Worst Frame Fake Score",    weight=risk_score),
        FeatureWeight(feature="Average Frame Fake Score",  weight=avg_score),
        FeatureWeight(feature="Fake Frame Count",          weight=float(fake_frames)),
        FeatureWeight(feature="Total Frames Analysed",     weight=float(len(frame_results))),
    ]

    scan_id   = str(uuid.uuid4())
    timestamp = datetime.now().isoformat()
    response  = DeepfakeScanResponse(
        scan_id             = scan_id,
        input_type          = "video",
        threat_type         = "Deepfake / AI-Manipulated Video",
        verdict             = _verdict(risk_score),
        risk_score          = risk_score,
        confidence          = confidence,
        explanation         = (
            f"Analysed {len(frame_results)} keyframes. "
            f"{fake_frames} frame(s) show deepfake indicators. "
            f"Worst frame risk: {risk_score}%, average: {avg_score}%. "
            f"{'High-confidence deepfake detected.' if risk_score >= 75 else 'Manual review recommended.' if risk_score >= 25 else 'Video appears authentic.'}"
        ),
        signals             = signals,
        feature_weights     = feature_weights,
        recommendations     = [
            "Do not share or trust this video without independent verification." if risk_score >= 50
            else "Video appears authentic — continue standard verification practices.",
            "Cross-reference the video with trusted sources.",
            "Report to platform moderators if context is suspicious.",
        ],
        highlighted_segments= [f"Frame {r['frame_index']}: {r['risk_score']}%" for r in frame_results if r["risk_score"] >= 50],
        timestamp           = timestamp,
    )

    save_incident({
        **response.model_dump(),
        "content_preview": f"Video: {file.filename} ({len(frames)} frames analysed)",
    })

    return response
