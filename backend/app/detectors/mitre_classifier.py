# backend/app/detectors/mitre_classifier.py

# Your existing detectors already classify threats.
# This file maps their output to MITRE tactic names.

DETECTOR_TO_MITRE = {
    # Phishing / Email
    "phishing": "initial-access",
    "spearphishing": "initial-access",
    "phishing threat": "initial-access",

    # URL
    "malicious_url": "initial-access",
    "malicious url": "initial-access",
    "url threat": "initial-access",

    # AI Content
    "ai-generated_content": "execution",
    "ai_generated_content": "execution",
    "ai generated content": "execution",
    "ai content": "execution",

    # Prompt Injection
    "prompt_injection": "execution",
    "prompt injection": "execution",
    "prompt injection threat": "execution",

    # Anomaly / Login
    "anomaly": "discovery",
    "login anomaly": "discovery",
    "anomalous login": "discovery",
    "anomaly threat": "discovery",
    "port_scan": "reconnaissance",
    "port scan": "reconnaissance",
    "unusual_traffic": "command-and-control",

    # Deepfake
    "deepfake": "initial-access",
    "deepfake threat": "initial-access",

    # Compound — multiple threats = later kill chain stage
    "compound threat": "privilege-escalation",
    "compound_threat": "privilege-escalation",
    "multi-vector threat": "privilege-escalation",

    # Generic malware/intrusion
    "malware": "execution",
    "ransomware": "impact",
    "brute_force": "credential-access",
    "brute force": "credential-access",
    "privilege_escalation": "privilege-escalation",
    "lateral_movement": "lateral-movement",
    "data_exfiltration": "exfiltration",
    "exfiltration": "exfiltration",
    "c2": "command-and-control",
    "command and control": "command-and-control",
}
TACTIC_ORDER = [
    "reconnaissance", "resource-development", "initial-access",
    "execution", "persistence", "privilege-escalation",
    "defense-evasion", "credential-access", "discovery",
    "lateral-movement", "collection", "command-and-control",
    "exfiltration", "impact"
]

def map_to_mitre(threat_type: str) -> dict:
    threat_type_clean = threat_type.lower().replace(" ", "_")
    
    # If it's an error — return None so UI can handle it
    if "error" in threat_type_clean or "analysis_error" in threat_type_clean:
        return None
    
    tactic = DETECTOR_TO_MITRE.get(threat_type_clean, None)
    
    if not tactic:
        return None
    
    return {
        "tactic": tactic,
        "stage": TACTIC_ORDER.index(tactic) + 1,
        "total_stages": 14,
        "tactic_display": tactic.replace("-", " ").title()
    }