from pydantic import BaseModel
from typing import List, Optional, Any

class ScanRequest(BaseModel):
    input_type: str  # email | url | prompt | login_log | ai_text
    content: str

class FeatureWeight(BaseModel):
    feature: str
    weight: float

class ScanResponse(BaseModel):
    scan_id: str
    input_type: str
    threat_type: str
    verdict: str
    risk_score: float
    confidence: float
    explanation: str
    signals: List[str]
    feature_weights: List[FeatureWeight]
    recommendations: List[str]
    highlighted_segments: List[str]
    timestamp: str

class DeepfakeScanResponse(BaseModel):
    scan_id: str
    input_type: str = "image"
    threat_type: str = "Deepfake / AI-Generated Image"
    verdict: str
    risk_score: float
    confidence: float
    explanation: str
    signals: List[str]
    feature_weights: List[FeatureWeight]
    recommendations: List[str]
    highlighted_segments: List[str]
    timestamp: str

class IncidentSummary(BaseModel):
    scan_id: str
    input_type: str
    threat_type: str
    verdict: str
    risk_score: float
    timestamp: str
    content_preview: str
