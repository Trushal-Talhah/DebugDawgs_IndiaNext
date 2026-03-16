import sys
sys.path.insert(0, ".")

import app.detectors.url_analyzer as url_analyzer

print("── Model Load Test ──────────────────────────")
result = url_analyzer._load_model()
print(f"Load success  : {result}")
print(f"_model_ok     : {url_analyzer._model_ok}")           # ← live reference
print(f"Feature count : {len(url_analyzer._feature_names) if url_analyzer._feature_names else 0}")
print(f"Features      : {url_analyzer._feature_names}")
print(f"SHAP loaded   : {url_analyzer._shap_explainer is not None}")

from app.detectors.url_analyzer import (
    extract_url_features, compute_url_risk_score,
    get_url_highlights, compute_url_confidence
)

test_urls = [
    ("Normal HTTPS",    "https://www.google.com/search?q=python",                  "SAFE"),
    ("Phishing login",  "http://paypal-secure-login.tk/verify/account",             "HIGH"),
    ("IP-based URL",    "http://192.168.1.1/admin/login.php",                       "HIGH"),
    ("Typosquatting",   "https://arnazon.com/signin/credentials",                   "MEDIUM"),
    ("Redirect chain",  "https://bit.ly/goto=http://evil.ru/phish",                 "HIGH"),
]

print(f"\n── URL Scoring Test (ML model active: {url_analyzer._model_ok}) ──────────────")
print(f"{'Name':<20} {'Score':>6}  {'Verdict':<8}  {'Top Signal'}")
print("-" * 95)

all_passed = True
for name, url, expected in test_urls:
    feats              = extract_url_features(url)
    score, fw, signals = compute_url_risk_score(feats)
    confidence         = compute_url_confidence(signals, score)

    if   score >= 75: verdict = "HIGH"
    elif score >= 50: verdict = "MEDIUM"
    elif score >= 25: verdict = "LOW"
    else:             verdict = "SAFE"

    passed     = verdict == expected
    all_passed = all_passed and passed
    icon       = "✅" if passed else "❌"
    top_signal = signals[0][:55] if signals else "—"
    print(f"{icon} {name:<20} {score:>6.1f}  {verdict:<8}  {top_signal}")

print(f"\n{'✅ ALL PASSED' if all_passed else '❌ SOME FAILED — check scores above'}")

print("\n── Feature Debug ────────────────────────────────────")
debug_urls = [
    ("Normal HTTPS",  "https://www.google.com/search?q=python"),
    ("Redirect chain","https://bit.ly/goto=http://evil.ru/phish"),
]
for name, url in debug_urls:
    feats = extract_url_features(url)
    print(f"\n{name}: {url}")
    for k, v in feats.items():
        print(f"  {k:<25}: {v}")
