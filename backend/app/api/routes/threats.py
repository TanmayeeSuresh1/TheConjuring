"""Threat history and reporting routes."""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import ThreatScan, ThreatReport

router = APIRouter()


@router.get("/history")
async def get_threat_history(
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(ThreatScan)
        .where(ThreatScan.user_id == uuid.UUID(current_user["user_id"]))
        .order_by(desc(ThreatScan.created_at))
        .limit(limit).offset(offset)
    )
    scans = result.scalars().all()
    return {
        "scans": [
            {
                "id": str(s.id), "scan_type": s.scan_type, "status": s.status,
                "risk_score": s.risk_score, "risk_level": s.risk_level,
                "input_preview": s.input_preview, "duration_ms": s.scan_duration_ms,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in scans
        ],
        "total": len(scans), "limit": limit, "offset": offset,
    }


@router.get("/{scan_id}/report")
async def get_scan_report(
    scan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(ThreatReport).where(ThreatReport.scan_id == uuid.UUID(scan_id))
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return {
        "scan_id": scan_id,
        "pii_detections": report.pii_detections,
        "nlp_entities": report.nlp_entities,
        "anomaly_scores": report.anomaly_scores,
        "risk_breakdown": report.risk_breakdown,
        "ai_explanation": report.ai_explanation,
        "model_confidence": report.model_confidence,
        "detection_pipeline": report.detection_pipeline,
        "created_at": report.created_at.isoformat() if report.created_at else None,
    }
