# backend/app/detectors/mitre_classifier.py

# Your existing detectors already classify threats.
# This file maps their output to MITRE tactic names.

DETECTOR_TO_MITRE = {
    # From phishing_detector.py
    "phishing": "initial-access",
    "spearphishing": "initial-access",
    
    # From anomaly_detector.py
    "anomaly": "discovery",
    "port_scan": "reconnaissance",
    "unusual_traffic": "command-and-control",
    
    # From ai_content_detector.py
    "malicious_content": "execution",
    "prompt_injection": "execution",
    
    # From url_analyzer.py
    "malicious_url": "initial-access",
    "c2_communication": "command-and-control",
    
    # From deepfake_detector.py
    "deepfake": "initial-access",
    
    # Generic fallbacks
    "brute_force": "credential-access",
    "privilege_escalation": "privilege-escalation",
    "lateral_movement": "lateral-movement",
    "data_exfiltration": "exfiltration",
    "malware": "execution",
    "ransomware": "impact"
}

TACTIC_ORDER = [
    "reconnaissance", "resource-development", "initial-access",
    "execution", "persistence", "privilege-escalation",
    "defense-evasion", "credential-access", "discovery",
    "lateral-movement", "collection", "command-and-control",
    "exfiltration", "impact"
]

def map_to_mitre(detector_output: str) -> dict:
    """
    Takes whatever your existing detectors return
    and maps it to a MITRE tactic.
    """
    threat_type = detector_output.lower().replace(" ", "_")
    tactic = DETECTOR_TO_MITRE.get(threat_type, "discovery")
    stage = TACTIC_ORDER.index(tactic) + 1
    
    return {
        "tactic": tactic,
        "stage": stage,
        "total_stages": 14,
        "tactic_display": tactic.replace("-", " ").title()
    }