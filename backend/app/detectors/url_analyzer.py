import re
import math
import joblib
import pandas as pd
import numpy as np
import tldextract

from pathlib import Path
from urllib.parse import urlparse, parse_qs
from typing import Dict, Any, List, Tuple


# ── Model paths ───────────────────────────────────────────────────────────────
_BASE          = Path(__file__).resolve().parent.parent.parent / "models" / "url_model"
_MODEL_PATH    = _BASE / "url_rf_model.joblib"
_FEATURES_PATH = _BASE / "url_feature_names.joblib"
_SHAP_PATH     = _BASE / "url_shap_explainer.joblib"

# ── Lazy-loaded model state ───────────────────────────────────────────────────
_rf_model      = None
_feature_names = None
_shap_explainer = None
_model_ok      = False


def _load_model() -> bool:
    global _rf_model, _feature_names, _shap_explainer, _model_ok
    if _model_ok:
        return True
    try:
        _rf_model      = joblib.load(_MODEL_PATH)
        _feature_names = joblib.load(_FEATURES_PATH)
        try:
            _shap_explainer = joblib.load(_SHAP_PATH)
        except Exception as e:
            print(f"[url_analyzer] SHAP unavailable — using RF importances. Reason: {e}")
            _shap_explainer = None
        _model_ok = True
        return True
    except Exception as e:
        print(f"[url_analyzer] Model load failed — using heuristic fallback. Reason: {e}")
        _model_ok = False
        return False


# ── Constants ─────────────────────────────────────────────────────────────────
SUSPICIOUS_TLDS = {
    "tk", "ml", "ga", "cf", "gq", "xyz", "top", "click", "loan",
    "work", "party", "date", "review", "stream", "racing", "win", "gdn"
}

PHISHING_URL_KEYWORDS = [
    "login", "signin", "sign-in", "secure", "account", "update", "verify",
    "confirm", "banking", "paypal", "amazon", "apple", "google", "microsoft",
    "netflix", "facebook", "instagram", "password", "credential", "suspend", "unlock"
]


# ── Helpers ───────────────────────────────────────────────────────────────────
def _entropy(text: str) -> float:
    if not text:
        return 0.0
    freq = {}
    for c in text:
        freq[c] = freq.get(c, 0) + 1
    return -sum((f / len(text)) * math.log2(f / len(text)) for f in freq.values())


# ── Feature Extraction ────────────────────────────────────────────────────────
def extract_url_features(url: str) -> Dict[str, Any]:
    parsed          = urlparse(url)
    ext             = tldextract.extract(url)
    domain          = ext.domain or ""
    subdomain       = ext.subdomain or ""
    suffix          = ext.suffix or ""
    port            = parsed.port
    path_parts      = [p for p in parsed.path.split('/') if p]
    subdomain_depth = len([s for s in subdomain.split('.') if s]) if subdomain else 0
    has_ip          = 1 if re.match(r'^\d{1,3}(\.\d{1,3}){3}$', parsed.netloc.split(':')[0]) else 0

    # Check phishing keywords only in path+subdomain, NOT the registered domain
    _path_sub = (subdomain + parsed.path + "?" + parsed.query).lower()

    return {
        "url_length"         : len(url),
        "domain_length"      : len(domain),
        "subdomain_depth"    : subdomain_depth,
        "has_ip_address"     : has_ip,
        "digit_count_domain" : sum(c.isdigit() for c in domain),
        "hyphen_count_domain": domain.count('-'),
        "dot_count_url"      : url.count('.'),
        "suspicious_tld"     : 1 if suffix.split('.')[-1] in SUSPICIOUS_TLDS else 0,
        "uses_http"          : 1 if parsed.scheme == 'http' else 0,
        "has_non_std_port"   : 1 if (port and port not in [80, 443]) else 0,
        "path_depth"         : len(path_parts),
        "query_param_count"  : len(parse_qs(parsed.query)),
        "phishing_kw_count"  : sum(1 for k in PHISHING_URL_KEYWORDS if k in _path_sub),
        "url_entropy"        : round(_entropy(url), 4),
        "has_redirect"       : 1 if any(p in url.lower() for p in [
                                   'redirect', 'url=', 'link=', 'goto=',
                                   'next=', 'return=', 'redir=', 'forward='
                               ]) else 0,
        "has_at_symbol"      : 1 if '@' in url else 0,
        "has_double_slash"   : 1 if '//' in url.split('://', 1)[-1] else 0,
        "special_char_count" : sum(1 for c in url if c in '@!#$%^&*(){}[]|\\'),
        "domain_token_count" : len(re.split(r'[-_.]', domain)),
        "path_token_count"   : len(re.split(r'[-_/.]', parsed.path.strip('/'))),
        # Extra heuristic-only feature (not in ML model — used by _heuristic_score only)
        "has_embedded_url"   : 1 if "http" in parsed.path.lower() else 0,
    }


# ── ML Scoring ────────────────────────────────────────────────────────────────
def _ml_score(features: Dict[str, Any]) -> Tuple[float, List[Dict], List[str]]:
    X = pd.DataFrame([{f: features.get(f, 0) for f in _feature_names}])

    proba      = _rf_model.predict_proba(X)[0][1]
    risk_score = round(proba * 100, 1)

    if _shap_explainer is not None:
        shap_vals = _shap_explainer(X)
        raw = shap_vals.values[0]
        if raw.ndim == 2:
            raw = raw[:, 1]
        shap_pairs = sorted(
            zip(_feature_names, raw.tolist()),
            key=lambda x: abs(x[1]),
            reverse=True
        )[:6]
        total_abs = sum(abs(v) for _, v in shap_pairs) or 1.0
        feature_weights = [
            {"feature": n.replace("_", " ").title(), "weight": round(abs(v) / total_abs * 100, 1)}
            for n, v in shap_pairs if abs(v) > 0
        ]
        signals = [
            f"{n.replace('_', ' ').title()} flagged as malicious indicator (SHAP: +{v:.3f})"
            for n, v in shap_pairs if v > 0 and features.get(n, 0)
        ][:5]
    else:
        # Fallback: RF global feature_importances_
        pairs = sorted(zip(_feature_names, _rf_model.feature_importances_), key=lambda x: x[1], reverse=True)[:6]
        total = sum(v for _, v in pairs) or 1.0
        feature_weights = [
            {"feature": n.replace("_", " ").title(), "weight": round(v / total * 100, 1)}
            for n, v in pairs if v > 0
        ]
        signals = [
            f"{n.replace('_', ' ').title()} is a key malicious indicator"
            for n, v in pairs if features.get(n, 0)
        ][:5]

    return risk_score, feature_weights, signals


# ── Heuristic Scoring (fallback) ──────────────────────────────────────────────
def _heuristic_score(features: Dict[str, Any]) -> Tuple[float, List[Dict], List[str]]:
    score        = 0.0
    attributions = []
    signals      = []

    checks = [
        (features["has_ip_address"],                           28, "IP Address as Domain",        "IP address used instead of domain name"),
        (features["suspicious_tld"],                           22, "Suspicious TLD",              "High-risk top-level domain detected"),
        (features["uses_http"],                                10, "Unencrypted HTTP",             "No HTTPS encryption"),
        (features["has_non_std_port"],                         12, "Non-Standard Port",            "Non-standard port number in URL"),
        (features["has_redirect"],                             12, "Redirect Parameter",           "URL redirect chain detected"),
        (features["has_double_slash"],                         10, "Double Slash Redirect",        "Double slash after domain — redirect obfuscation"),
        (features["has_at_symbol"],                            15, "At Symbol in URL",             "@ symbol used to obscure true destination"),
        (features.get("has_embedded_url", 0),                  25, "Embedded URL in Path",         "URL hidden inside path — classic redirect attack"),
        (1 if features["subdomain_depth"] >= 3 else 0,         15, "Excessive Subdomain Nesting",  "Multiple nested subdomains detected"),
        (1 if features["hyphen_count_domain"] >= 2 else 0,      8, "Typosquatting Pattern",        "Multiple hyphens suggest typosquatting"),
        (1 if features["url_entropy"] > 4.5 else 0,             8, "High URL Entropy",             "High character entropy — obfuscated URL"),
    ]
    for condition, weight, label, signal in checks:
        if condition:
            score += weight
            attributions.append({"feature": label, "weight": weight})
            signals.append(signal)

    kw_score = min(features["phishing_kw_count"] * 12, 28)
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
    total = sum(a["weight"] for a in attributions) or 1.0
    for a in attributions:
        a["weight"] = round(a["weight"] / total * 100, 1)
    attributions.sort(key=lambda x: x["weight"], reverse=True)

    return final_score, attributions[:6], signals


# ── Public API ────────────────────────────────────────────────────────────────
def compute_url_risk_score(features: Dict[str, Any]) -> Tuple[float, List[Dict], List[str]]:
    """
    Scoring priority:
      1. RF model (ML) + SHAP — primary
      2. Heuristic fallback — if model missing or errors
    Post-prediction overrides correct known ML blind spots.
    """
    if _load_model():
        try:
            ml_score, ml_weights, ml_signals = _ml_score(features)
            h_score,  h_weights,  h_signals  = _heuristic_score(features)

            # Override 1: Dampen ML overconfidence on clean HTTPS URLs
            hard_indicator_sum = (
                features["has_ip_address"]    +
                features["suspicious_tld"]    +
                features["uses_http"]         +
                features["phishing_kw_count"] +
                features["has_at_symbol"]
            )
            if hard_indicator_sum == 0:
                ml_score = min(ml_score, 30.0)

            # Override 2: Floor ML score when redirect signals are present
            if features["has_redirect"] == 1 or features["has_double_slash"] == 1:
                ml_score = max(ml_score, 50.0)

            # Blend: 65% ML + 35% heuristic
            final_score = round(min(0.65 * ml_score + 0.35 * h_score, 100.0), 1)

            # Override 3: Post-blend floor for confirmed redirect obfuscation
            if (features["has_redirect"] == 1
                    and features["has_double_slash"] == 1
                    and features.get("has_embedded_url", 0) == 1):
                final_score = max(final_score, 78.0)   # all 3 = confirmed redirect attack → HIGH
            elif features["has_redirect"] == 1 and features["has_double_slash"] == 1:
                final_score = max(final_score, 65.0)   # redirect + double slash → MEDIUM-HIGH
            elif features["has_redirect"] == 1:
                final_score = max(final_score, 52.0)   # redirect only → MEDIUM


            # Merge signals
            merged_signals = ml_signals[:]
            for s in h_signals:
                if not any(s[:20] in ms for ms in merged_signals):
                    merged_signals.append(s)

            return final_score, ml_weights or h_weights, merged_signals[:5]

        except Exception as e:
            print(f"[url_analyzer] ML scoring failed — falling back to heuristic. Reason: {e}")

    return _heuristic_score(features)


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
    base = 70.0 if _model_ok else 55.0
    return min(base + len(signals) * 5, 95.0)
