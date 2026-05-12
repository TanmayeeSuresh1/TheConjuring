"""Authentication routes — login, register, refresh."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
)
from app.models.models import User, Organization

router = APIRouter()


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    org_name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    # Create org if provided
    org = None
    if body.org_name:
        org = Organization(name=body.org_name, domain=body.email.split("@")[1])
        db.add(org)
        await db.flush()

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        role="admin" if body.org_name else "employee",
        org_id=org.id if org else None,
    )
    db.add(user)
    await db.flush()

    token_data = {"sub": str(user.id), "role": user.role, "org_id": str(user.org_id) if user.org_id else None}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user={"id": str(user.id), "email": user.email, "role": user.role, "full_name": user.full_name},
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    user.last_login = datetime.now(timezone.utc)

    token_data = {"sub": str(user.id), "role": user.role, "org_id": str(user.org_id) if user.org_id else None}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        user={"id": str(user.id), "email": user.email, "role": user.role, "full_name": user.full_name},
    )


@router.post("/refresh")
async def refresh_token(body: dict):
    token = body.get("refresh_token")
    if not token:
        raise HTTPException(status_code=400, detail="refresh_token required")
    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=400, detail="Invalid token type")
    new_access = create_access_token({"sub": payload["sub"], "role": payload.get("role"), "org_id": payload.get("org_id")})
    return {"access_token": new_access, "token_type": "bearer"}
