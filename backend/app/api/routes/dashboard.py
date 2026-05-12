"""Dashboard analytics routes."""
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import ThreatScan

router = APIRouter()


@router.get("/analytics")
async def get_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    uid = uuid.UUID(current_user["user_id"])
    since = datetime.now(timezone.utc) - timedelta(days=30)

    total_result = await db.execute(
        select(func.count(ThreatScan.id)).where(ThreatScan.user_id == uid)
    )
    total_scans = total_result.scalar() or 0

    risk_result = await db.execute(
        select(ThreatScan.risk_level, func.count(ThreatScan.id))
        .where(ThreatScan.user_id == uid)
        .group_by(ThreatScan.risk_level)
    )
    risk_breakdown = {row[0]: row[1] for row in risk_result.all()}

    type_result = await db.execute(
        select(ThreatScan.scan_type, func.count(ThreatScan.id))
        .where(ThreatScan.user_id == uid)
        .group_by(ThreatScan.scan_type)
    )
    scan_types = {row[0]: row[1] for row in type_result.all()}

    recent_result = await db.execute(
        select(ThreatScan)
        .where(ThreatScan.user_id == uid)
        .order_by(desc(ThreatScan.created_at))
        .limit(5)
    )
    recent = recent_result.scalars().all()

    return {
        "total_scans": total_scans,
        "risk_breakdown": risk_breakdown,
        "scan_types": scan_types,
        "threats_blocked": risk_breakdown.get("critical", 0) + risk_breakdown.get("high", 0),
        "recent_scans": [
            {"id": str(s.id), "type": s.scan_type, "risk_level": s.risk_level,
             "risk_score": s.risk_score, "created_at": s.created_at.isoformat() if s.created_at else None}
            for s in recent
        ],
    }
