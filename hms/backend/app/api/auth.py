from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.models.models import User, Patient, Doctor
from app.schemas.schemas import LoginRequest, TokenResponse, RegisterRequest, ChangePasswordRequest
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username, User.is_active == True).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user.last_login = datetime.utcnow()
    db.commit()

    token_data = {"sub": str(user.user_id), "role": user.role}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        role=user.role,
        user_id=user.user_id,
        username=user.username,
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")

    # Validate linked IDs
    if payload.role == "patient":
        if not payload.linked_patient_id:
            raise HTTPException(status_code=400, detail="Patient role requires linked_patient_id")
        if not db.query(Patient).filter(Patient.patient_id == payload.linked_patient_id).first():
            raise HTTPException(status_code=404, detail="Patient not found")
    elif payload.role == "doctor":
        if not payload.linked_doctor_id:
            raise HTTPException(status_code=400, detail="Doctor role requires linked_doctor_id")
        if not db.query(Doctor).filter(Doctor.doctor_id == payload.linked_doctor_id).first():
            raise HTTPException(status_code=404, detail="Doctor not found")

    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=payload.role,
        linked_patient_id=payload.linked_patient_id,
        linked_doctor_id=payload.linked_doctor_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "User registered successfully", "user_id": user.user_id}


@router.post("/refresh")
def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = db.query(User).filter(User.user_id == int(payload["sub"]), User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    token_data = {"sub": str(user.user_id), "role": user.role}
    return {"access_token": create_access_token(token_data), "token_type": "bearer"}


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "user_id":           current_user.user_id,
        "username":          current_user.username,
        "role":              current_user.role,
        "linked_patient_id": current_user.linked_patient_id,
        "linked_doctor_id":  current_user.linked_doctor_id,
        "last_login":        current_user.last_login,
    }
