import re
from typing import Dict, List, Tuple

URGENCY_KEYWORDS = [
    "urgent", "immediately", "asap", "act now", "don't delay", "time sensitive",
    "limited time", "expires", "deadline", "last chance", "final notice",
    "action required", "response required", "immediate action", "within 24 hours",
    "within 48 hours", "respond now", "critical update"
]

FINANCIAL_KEYWORDS = [
    "bank account", "credit card", "debit card", "wire transfer", "bitcoin",
    "cryptocurrency", "paypal", "invoice", "billing", "charges", "refund",
    "reward", "prize", "lottery", "inheritance", "million dollars",
    "unclaimed funds", "cash prize", "gift card", "amazon gift", "payment required"
]

THREAT_KEYWORDS = [
    "suspended", "blocked", "banned", "terminated", "deleted", "deactivated",
    "locked", "unauthorized access", "breach", "compromised", "hacked",
    "security alert", "fraud detected", "suspicious activity", "verify identity",
    "account will be", "legal action", "report to authorities", "law enforcement"
]

PHISHING_PHRASES = [
    "click here", "click the link", "verify your account", "confirm your identity",
    "update your information", "login to your account", "sign in here",
    "enter your password", "provide your details", "complete verification",
    "dear customer", "dear user", "dear account holder", "dear valued",
    "your account has been", "unusual sign-in activity", "we have detected",
    "kindly provide", "we need you to"
]

SUSPICIOUS_DOMAINS = ["bit.ly", "tinyurl", "goo.gl", "ow.ly", ".tk", ".ml", ".ga", ".cf", ".gq"]


def extract_phishing_features(text: str) -> Dict[str, float]:
    text_lower = text.lower()
    return {
        "urgency_score": min(sum(1 for k in URGENCY_KEYWORDS if k in text_lower) * 15, 45),
        "financial_score": min(sum(1 for k in FINANCIAL_KEYWORDS if k in text_lower) * 10, 35),
        "threat_score": min(sum(1 for k in THREAT_KEYWORDS if k in text_lower) * 15, 45),
        "phrase_score": min(sum(1 for p in PHISHING_PHRASES if p in text_lower) * 8, 30),
        "url_density_score": min(len(re.findall(r'https?://', text_lower)) * 5, 20),
        "suspicious_url_score": min(sum(1 for d in SUSPICIOUS_DOMAINS if d in text_lower) * 15, 30),
        "exclamation_score": min(text.count('!') * 2, 10),
        "caps_score": min(int(sum(1 for c in text if c.isupper()) / max(len(text), 1) * 60), 20),
    }


def compute_phishing_risk(features: Dict[str, float]) -> Tuple[float, List[Dict]]:
    attributions = [
        {"feature": k.replace("_score", "").replace("_", " ").title(), "weight": v}
        for k, v in features.items() if v > 0
    ]
    attributions.sort(key=lambda x: x["weight"], reverse=True)
    risk_score = min(sum(features.values()), 100)
    total = sum(a["weight"] for a in attributions)
    if total > 0:
        for a in attributions:
            a["weight"] = round(a["weight"] / total * 100, 1)
    return risk_score, attributions[:6]


def get_phishing_signals(features: Dict[str, float]) -> List[str]:
    signals = []
    if features.get("urgency_score", 0) > 10:
        signals.append("High-urgency language detected")
    if features.get("financial_score", 0) > 10:
        signals.append("Financial request patterns detected")
    if features.get("threat_score", 0) > 10:
        signals.append("Account suspension/threat language found")
    if features.get("phrase_score", 0) > 8:
        signals.append("Classic phishing phrases present")
    if features.get("suspicious_url_score", 0) > 0:
        signals.append("Shortened or suspicious URLs detected")
    if features.get("caps_score", 0) > 10:
        signals.append("Abnormal capitalization pattern")
    return signals


def get_phishing_highlights(text: str) -> List[str]:
    text_lower = text.lower()
    found = [kw for kw in URGENCY_KEYWORDS + THREAT_KEYWORDS + PHISHING_PHRASES if kw in text_lower]
    return list(set(found))[:10]


def compute_confidence(signals: List[str], risk_score: float) -> float:
    return min(50.0 + len(signals) * 8 + risk_score * 0.1, 95.0)
