"""Threat history — no auth, returns empty list (DB writes removed)."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/history")
async def get_threat_history(limit: int = 20, offset: int = 0):
    return {"scans": [], "total": 0, "limit": limit, "offset": offset}


@router.get("/{scan_id}/report")
async def get_scan_report(scan_id: str):
    return {}
