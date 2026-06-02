from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.models import Doctor, User
from app.schemas.schemas import DoctorCreate, DoctorUpdate, DoctorResponse
from app.middleware.auth import get_current_user, require_role

router = APIRouter(prefix="/doctors", tags=["Doctors"])


def _get_doctor_or_404(doctor_id: int, db: Session) -> Doctor:
    d = db.query(Doctor).filter(Doctor.doctor_id == doctor_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return d


@router.get("/", response_model=List[DoctorResponse])
def list_doctors(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    specialization: Optional[str] = Query(None),
    availability: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Doctor)
    if search:
        term = f"%{search}%"
        q = q.filter(
            (Doctor.first_name.ilike(term)) |
            (Doctor.last_name.ilike(term)) |
            (Doctor.specialization.ilike(term))
        )
    if specialization:
        q = q.filter(Doctor.specialization.ilike(f"%{specialization}%"))
    if availability:
        q = q.filter(Doctor.availability_status == availability)
    return q.offset(skip).limit(limit).all()


@router.get("/me", response_model=DoctorResponse)
def get_my_doctor_profile(
    current_user: User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
):
    return _get_doctor_or_404(current_user.linked_doctor_id, db)


@router.get("/{doctor_id}", response_model=DoctorResponse)
def get_doctor(
    doctor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_doctor_or_404(doctor_id, db)


@router.post("/", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
def create_doctor(
    payload: DoctorCreate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    if db.query(Doctor).filter(Doctor.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(Doctor).filter(Doctor.license_number == payload.license_number).first():
        raise HTTPException(status_code=400, detail="License number already registered")
    doctor = Doctor(**payload.model_dump())
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor


@router.put("/{doctor_id}", response_model=DoctorResponse)
def update_doctor(
    doctor_id: int,
    payload: DoctorUpdate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    doctor = _get_doctor_or_404(doctor_id, db)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(doctor, field, value)
    db.commit()
    db.refresh(doctor)
    return doctor


@router.delete("/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_doctor(
    doctor_id: int,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    doctor = _get_doctor_or_404(doctor_id, db)
    db.delete(doctor)
    db.commit()


@router.put("/{doctor_id}/availability")
def update_availability(
    doctor_id: int,
    availability_status: str,
    current_user: User = Depends(require_role("admin", "doctor")),
    db: Session = Depends(get_db),
):
    if current_user.role == "doctor" and current_user.linked_doctor_id != doctor_id:
        raise HTTPException(status_code=403, detail="Access denied")
    doctor = _get_doctor_or_404(doctor_id, db)
    valid = ["Available", "Busy", "On Leave", "Inactive"]
    if availability_status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {valid}")
    doctor.availability_status = availability_status
    db.commit()
    return {"message": "Availability updated", "status": availability_status}
