from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.models import Patient, User
from app.schemas.schemas import PatientCreate, PatientUpdate, PatientResponse
from app.middleware.auth import get_current_user, require_role

router = APIRouter(prefix="/patients", tags=["Patients"])


def _get_patient_or_404(patient_id: int, db: Session) -> Patient:
    p = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    return p


@router.get("/", response_model=List[PatientResponse])
def list_patients(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    current_user: User = Depends(require_role("admin", "doctor")),
    db: Session = Depends(get_db),
):
    q = db.query(Patient)
    if search:
        term = f"%{search}%"
        q = q.filter(
            (Patient.first_name.ilike(term)) |
            (Patient.last_name.ilike(term)) |
            (Patient.email.ilike(term)) |
            (Patient.phone_number.ilike(term))
        )
    return q.offset(skip).limit(limit).all()


@router.get("/me", response_model=PatientResponse)
def get_my_profile(
    current_user: User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
):
    return _get_patient_or_404(current_user.linked_patient_id, db)


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Patients can only view their own profile
    if current_user.role == "patient" and current_user.linked_patient_id != patient_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return _get_patient_or_404(patient_id, db)


@router.post("/", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    if db.query(Patient).filter(Patient.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    patient = Patient(**payload.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: int,
    payload: PatientUpdate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    patient = _get_patient_or_404(patient_id, db)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(patient, field, value)
    db.commit()
    db.refresh(patient)
    return patient


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(
    patient_id: int,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    patient = _get_patient_or_404(patient_id, db)
    db.delete(patient)
    db.commit()


@router.get("/{patient_id}/summary")
def patient_summary(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == "patient" and current_user.linked_patient_id != patient_id:
        raise HTTPException(status_code=403, detail="Access denied")
    result = db.execute(
        "SELECT * FROM get_patient_medical_summary(:pid)", {"pid": patient_id}
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Patient not found")
    return dict(result._mapping)
