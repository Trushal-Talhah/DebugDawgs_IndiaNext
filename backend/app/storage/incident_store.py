import json
import os
from typing import List, Dict, Any
from app.config import settings


def _load() -> List[Dict]:
    if not os.path.exists(settings.INCIDENTS_FILE):
        os.makedirs(os.path.dirname(settings.INCIDENTS_FILE), exist_ok=True)
        return []
    with open(settings.INCIDENTS_FILE, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []


def _save(incidents: List[Dict]) -> None:
    os.makedirs(os.path.dirname(settings.INCIDENTS_FILE), exist_ok=True)
    with open(settings.INCIDENTS_FILE, "w") as f:
        json.dump(incidents, f, indent=2)


def save_incident(data: Dict[str, Any]) -> None:
    incidents = _load()
    incidents.insert(0, data)
    _save(incidents[:500])


def get_incidents(limit: int = 50) -> List[Dict]:
    return _load()[:limit]


def get_incident_by_id(scan_id: str) -> Dict | None:
    return next((i for i in _load() if i.get("scan_id") == scan_id), None)
