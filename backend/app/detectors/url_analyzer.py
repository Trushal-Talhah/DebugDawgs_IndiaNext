import re
import math
from urllib.parse import urlparse, parse_qs
from typing import Dict, Any, List, Tuple
import tldextract

SUSPICIOUS_TLDS = {
    "tk", "ml", "ga", "cf", "gq", "xyz", "top", "click", "loan",
    "work", "party", "date", "review", "stream", "racing", "win", "gdn"
}

PHISHING_URL_KEYWORDS = [
    "login", "signin", "sign-in", "secure", "account", "update", "verify",
    "confirm", "banking", "paypal", "amazon", "apple", "google", "microsoft",
    "netflix", "facebook", "instagram", "password", "credential", "suspend", "unlock"
]


def _entropy(text: str) -> float:
    if not text:
        return 0.0
    freq = {}
    for c in text:
        freq[c] = freq.get(c, 0) + 1
    return -sum((f / len(text)) * math.log2(f / len(text)) for f in freq.values())


def extract_url_features(url: str) -> Dict[str, Any]:
    parsed = urlparse(url)
    ext = tldextract.extract(url)
    domain = ext.domain or ""
    subdomain = ext.subdomain or ""
    suffix = ext.suffix or ""
    port = parsed.port
    path_parts = [p for p in parsed.path.split('/') if p]
    subdomain_depth = len([s for s in subdomain.split('.') if s]) if subdomain else 0
    has_ip = 1 if re.match(r'^\d{1,3}(\.\d{1,3}){3}$', domain) else 0

    return {
        "url_length": len(url),
        "domain_length": len(domain),
        "subdomain_depth": subdomain_depth,
        "has_ip_address": has_ip,
        "digit_count_in_domain": sum(c.isdigit() for c in domain),
        "hyphen_count_in_domain": domain.count('-'),
        "suspicious_tld": 1 if suffix.split('.')[-1] in SUSPICIOUS_TLDS else 0,
        "uses_http": 1 if parsed.scheme == 'http' else 0,
        "has_non_standard_port": 1 if (port and port not in [80, 443]) else 0,
        "path_depth": len(path_parts),
        "query_param_count": len(parse_qs(parsed.query)),
        "phishing_keyword_count": sum(1 for k in PHISHING_URL_KEYWORDS if k in url.lower()),
        "url_entropy": _entropy(url),
        "has_redirect": 1 if any(p in url.lower() for p in ['redirect', 'url=', 'link=', 'goto=']) else 0,
        "special_char_count": sum(1 for c in url if c in '@!#$%^&*(){}[]|\\'),
    }


def compute_url_risk_score(features: Dict[str, Any]) -> Tuple[float, List[Dict], List[str]]:
    score = 0.0
    attributions = []
    signals = []

    checks = [
        (features["has_ip_address"], 28, "IP Address as Domain", "IP address used instead of domain name"),
        (features["suspicious_tld"], 22, "Suspicious TLD", "High-risk top-level domain detected"),
        (features["uses_http"], 10, "Unencrypted HTTP", "No HTTPS encryption"),
        (features["has_non_standard_port"], 12, "Non-Standard Port", "Non-standard port number in URL"),
        (features["has_redirect"], 12, "Redirect Parameter", "URL redirect chain detected"),
        (1 if features["subdomain_depth"] >= 3 else 0, 15, "Excessive Subdomain Nesting", "Multiple nested subdomains detected"),
        (1 if features["hyphen_count_in_domain"] >= 2 else 0, 8, "Typosquatting Pattern", "Multiple hyphens suggest typosquatting"),
        (1 if features["url_entropy"] > 4.5 else 0, 8, "High URL Entropy", "High character entropy — obfuscated URL"),
    ]
    for condition, weight, label, signal in checks:
        if condition:
            score += weight
            attributions.append({"feature": label, "weight": weight})
            signals.append(signal)

    kw_score = min(features["phishing_keyword_count"] * 12, 28)
    if kw_score > 0:
        score += kw_score
        attributions.append({"feature": "Phishing Keywords in URL", "weight": kw_score})
        signals.append("Brand/credential keywords found in URL path")

    if features["url_length"] > 80:
        c = min((features["url_length"] - 80) // 15 * 5, 15)
        if c > 0:
            score += c
            attributions.append({"feature": "Abnormally Long URL", "weight": c})
            signals.append("Unusually long URL — common obfuscation technique")

    final_score = min(score, 100)
    total = sum(a["weight"] for a in attributions)
    if total > 0:
        for a in attributions:
            a["weight"] = round(a["weight"] / total * 100, 1)
    attributions.sort(key=lambda x: x["weight"], reverse=True)

    return final_score, attributions[:6], signals


def get_url_highlights(url: str, features: Dict) -> List[str]:
    highlights = []
    if features["has_ip_address"]:
        match = re.search(r'\d{1,3}(\.\d{1,3}){3}', url)
        if match:
            highlights.append(match.group())
    ext = tldextract.extract(url)
    if ext.suffix.split('.')[-1] in SUSPICIOUS_TLDS:
        highlights.append(f".{ext.suffix}")
    for kw in PHISHING_URL_KEYWORDS:
        if kw in url.lower():
            highlights.append(kw)
    return list(set(highlights))[:8]


def compute_url_confidence(signals: List[str], risk_score: float) -> float:
    return min(55.0 + len(signals) * 7, 95.0)
