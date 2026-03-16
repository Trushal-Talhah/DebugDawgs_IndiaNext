# backend/app/api/prediction_routes.py

from fastapi import APIRouter
from app.detectors.mitre_classifier import map_to_mitre
from app.services.mitre_predictor import MITREMarkovChain
from app.models.schemas import PredictionResponse
import json
import os

router = APIRouter(prefix="/api", tags=["prediction"])

# Load weights once at module level
chain = MITREMarkovChain()
weights_path = os.path.join(
    os.path.dirname(__file__), 
    '../../data/mitre_weights.json'
)

try:
    chain.load(weights_path)
    print("MITRE weights loaded successfully")
except FileNotFoundError:
    print("WARNING: mitre_weights.json not found. Run setup_mitre.py first.")

@router.post("/predict")
async def predict_next_attack(payload: dict):
    """
    Takes a threat type from your existing detectors
    and returns MITRE-based predictions.
    """
    threat_type = payload.get("threat_type", "")
    
    # Map to MITRE
    mitre_data = map_to_mitre(threat_type)
    
    # Get predictions from Markov Chain
    predictions = chain.predict(mitre_data["tactic"], top_n=3)
    
    return {
        "current_tactic": mitre_data["tactic"],
        "tactic_display": mitre_data["tactic_display"],
        "stage": mitre_data["stage"],
        "total_stages": 14,
        "predictions": predictions,
        "model_info": {
            "method": "First-order Markov Chain",
            "source": "MITRE ATT&CK Enterprise CTI",
            "campaigns_analysed": chain.total_campaigns,
            "citation": "Sheyner et al. IEEE S&P 2002"
        }
    }