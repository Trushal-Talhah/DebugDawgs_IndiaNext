from pydantic import BaseModel
from typing import List, Dict


class ScanRequest(BaseModel):
    input_type: str
    content: str


class FeatureWeight(BaseModel):
    feature: str
    weight: float


class ModuleResult(BaseModel):
    threat_type: str
    risk_score: float
    confidence: float
    signals: List[str]


class ScanResponse(BaseModel):
    scan_id: str
    input_type: str

    # Primary verdict
    threat_type: str
    verdict: str
    risk_score: float
    confidence: float

    # Explainability
    explanation: str
    signals: List[str]
    feature_weights: List[FeatureWeight]
    recommendations: List[str]
    highlighted_segments: List[str]

    # Fusion fields
    fusion_score: float = 0.0
    fusion_verdict: str = "SAFE"
    threats_detected: List[str] = []
    per_module_scores: Dict[str, float] = {}
    is_compound_threat: bool = False
    compound_threat_label: str = ""
    modules_triggered: int = 0
    detector_results: List[ModuleResult] = []

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