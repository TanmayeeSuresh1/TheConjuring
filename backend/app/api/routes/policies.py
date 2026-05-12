"""Security policy management routes."""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user, require_role, UserRole
from app.models.models import Policy

router = APIRouter()


class PolicyCreate(BaseModel):
    name: str
    description: str = ""
    rules: list = []
    severity_override: str | None = None


@router.get("/")
async def list_policies(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user.get("org_id")
    if not org_id:
        return {"policies": []}
    result = await db.execute(
        select(Policy).where(Policy.org_id == uuid.UUID(org_id), Policy.is_active == True)
    )
    policies = result.scalars().all()
    return {
        "policies": [
            {"id": str(p.id), "name": p.name, "description": p.description,
             "rules": p.rules, "is_active": p.is_active,
             "created_at": p.created_at.isoformat() if p.created_at else None}
            for p in policies
        ]
    }


@router.post("/update")
async def create_or_update_policy(
    body: PolicyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.ANALYST)),
):
    org_id = current_user.get("org_id")
    if not org_id:
        raise HTTPException(status_code=400, detail="No organization associated with user")
    policy = Policy(
        org_id=uuid.UUID(org_id),
        name=body.name,
        description=body.description,
        rules=body.rules,
        severity_override=body.severity_override,
    )
    db.add(policy)
    return {"message": "Policy created", "policy_id": str(policy.id)}
