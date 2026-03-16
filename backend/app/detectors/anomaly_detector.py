import json
import re
from datetime import datetime, timedelta
from typing import Dict, Any, List, Tuple
from collections import Counter


def _parse_logs(raw: str) -> List[Dict]:
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return data
        return []
    except (json.JSONDecodeError, TypeError):
        return []


def _parse_ts(ts_str: str) -> datetime | None:
    formats = [
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f"
    ]
    for fmt in formats:
        try:
            return datetime.strptime(ts_str[:19], fmt[:len(ts_str[:19])])
        except ValueError:
            continue
    return None


def _check_brute_force(logs: List[Dict]) -> Tuple[float, str | None]:
    failed = [(l, _parse_ts(l.get("timestamp", ""))) for l in logs if l.get("status") == "failed"]
    failed = [(l, t) for l, t in failed if t is not None]
    failed.sort(key=lambda x: x[1])

    for i in range(len(failed) - 3):
        window = [t for _, t in failed[i:i + 5]]
        if len(window) >= 4 and (window[-1] - window[0]).total_seconds() <= 60:
            return 40.0, f"Brute force: {len(window)} failed logins within 60 seconds"
    if len(failed) >= 3:
        return 20.0, f"Multiple failed logins detected ({len(failed)} attempts)"
    return 0.0, None


def _check_impossible_travel(logs: List[Dict]) -> Tuple[float, str | None]:
    successes = [
        (l.get("country", ""), _parse_ts(l.get("timestamp", "")))
        for l in logs if l.get("status") == "success" and l.get("country")
    ]
    successes = [(c, t) for c, t in successes if t is not None]
    successes.sort(key=lambda x: x[1])

    for i in range(len(successes) - 1):
        c1, t1 = successes[i]
        c2, t2 = successes[i + 1]
        if c1 != c2 and (t2 - t1).total_seconds() < 7200:
            return 45.0, f"Impossible travel: login from {c1} then {c2} within {int((t2-t1).total_seconds()/60)} minutes"
    return 0.0, None


def _check_off_hours(logs: List[Dict]) -> Tuple[float, str | None]:
    off_hours = [
        l for l in logs
        if l.get("status") == "success" and _parse_ts(l.get("timestamp", "")) is not None
        and 0 <= _parse_ts(l["timestamp"]).hour < 5
    ]
    if off_hours:
        return 15.0, f"Off-hours access: {len(off_hours)} login(s) between 12 AM - 5 AM"
    return 0.0, None


def _check_high_failure_rate(logs: List[Dict]) -> Tuple[float, str | None]:
    if not logs:
        return 0.0, None
    failed = sum(1 for l in logs if l.get("status") == "failed")
    rate = failed / len(logs)
    if rate > 0.75:
        return 20.0, f"High failure rate: {int(rate*100)}% of login attempts failed"
    return 0.0, None


def _check_multiple_ips(logs: List[Dict]) -> Tuple[float, str | None]:
    ips = set(l.get("ip", "") for l in logs if l.get("ip"))
    if len(ips) > 6:
        return 15.0, f"Login attempts from {len(ips)} distinct IP addresses"
    elif len(ips) > 3:
        return 8.0, f"Multiple IPs detected ({len(ips)} unique addresses)"
    return 0.0, None


def _check_rapid_success(logs: List[Dict]) -> Tuple[float, str | None]:
    successes = [
        (l.get("ip", ""), _parse_ts(l.get("timestamp", "")))
        for l in logs if l.get("status") == "success"
    ]
    successes = [(ip, t) for ip, t in successes if t is not None]
    successes.sort(key=lambda x: x[1])
    for i in range(len(successes) - 2):
        window = successes[i:i + 3]
        if (window[-1][1] - window[0][1]).total_seconds() < 5:
            return 25.0, "Rapid session chaining: 3+ successful logins within 5 seconds"
    return 0.0, None


def _verdict(score: float) -> str:
    if score >= 75: return "HIGH"
    elif score >= 50: return "MEDIUM"
    elif score >= 25: return "LOW"
    return "SAFE"


def detect(raw_log: str) -> Dict[str, Any]:
    logs = _parse_logs(raw_log)

    if not logs:
        return {
            "risk_score": 0.0, "confidence": 0.0, "verdict": "SAFE",
            "threat_type": "Anomalous Login Activity",
            "signals": ["Could not parse login log — ensure valid JSON array format"],
            "feature_weights": [], "highlighted_segments": []
        }

    checks = [
        _check_brute_force(logs),
        _check_impossible_travel(logs),
        _check_off_hours(logs),
        _check_high_failure_rate(logs),
        _check_multiple_ips(logs),
        _check_rapid_success(logs),
    ]

    total_score = 0.0
    attributions = []
    signals = []

    check_labels = [
        "Brute Force Detection",
        "Impossible Travel",
        "Off-Hours Access",
        "High Failure Rate",
        "Multiple Source IPs",
        "Rapid Session Chaining"
    ]

    for (score, signal), label in zip(checks, check_labels):
        if score > 0 and signal:
            total_score += score
            attributions.append({"feature": label, "weight": score})
            signals.append(signal)

    final_score = min(total_score, 100)
    total_w = sum(a["weight"] for a in attributions)
    if total_w > 0:
        for a in attributions:
            a["weight"] = round(a["weight"] / total_w * 100, 1)
    attributions.sort(key=lambda x: x["weight"], reverse=True)

    suspicious_ips = list(set(
        l.get("ip", "") for l in logs
        if l.get("status") == "failed" and l.get("ip")
    ))[:5]

    return {
        "risk_score": round(final_score, 1),
        "confidence": round(min(55 + len(signals) * 10, 92), 1),
        "verdict": _verdict(final_score),
        "threat_type": "Anomalous Login Activity",
        "signals": signals,
        "feature_weights": attributions[:5],
        "highlighted_segments": suspicious_ips
    }
