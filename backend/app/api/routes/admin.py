"""Admin routes - audit logs, user management."""
from fastapi import APIRouter, Depends
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user, require_role, UserRole
from app.models.models import AuditLog, User

router = APIRouter()


@router.get("/audit")
async def get_audit_logs(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.ANALYST)),
):
    result = await db.execute(
        select(AuditLog).order_by(desc(AuditLog.created_at)).limit(limit)
    )
    logs = result.scalars().all()
    return {
        "logs": [
            {"id": str(l.id), "action": l.action, "resource_type": l.resource_type,
             "ip_address": l.ip_address, "metadata": l.metadata,
             "created_at": l.created_at.isoformat() if l.created_at else None}
            for l in logs
        ]
    }


@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(select(User).where(User.is_active == True))
    users = result.scalars().all()
    return {
        "users": [
            {"id": str(u.id), "email": u.email, "full_name": u.full_name,
             "role": u.role, "created_at": u.created_at.isoformat() if u.created_at else None}
            for u in users
        ]
    }
