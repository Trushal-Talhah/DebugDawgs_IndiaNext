from typing import List
from fastapi import APIRouter, HTTPException
from app.models.schemas import IncidentSummary
from app.storage.incident_store import get_incidents, get_incident_by_id

router = APIRouter()


@router.get("/incidents", response_model=List[IncidentSummary])
async def list_incidents(limit: int = 50):
    return [
        IncidentSummary(
            scan_id=i["scan_id"],
            input_type=i["input_type"],
            threat_type=i["threat_type"],
            verdict=i["verdict"],
            risk_score=i["risk_score"],
            timestamp=i["timestamp"],
            content_preview=i.get("content_preview", "")
        )
        for i in get_incidents(limit)
    ]


@router.get("/incidents/{scan_id}")
async def get_incident(scan_id: str):
    incident = get_incident_by_id(scan_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident
