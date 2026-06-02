from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.core.database import get_db
from app.models.models import MedicalRecord, Prescription, User
from app.schemas.schemas import (
    MedicalRecordCreate, MedicalRecordUpdate, MedicalRecordResponse,
    PrescriptionCreate, PrescriptionUpdate, PrescriptionResponse,
)
from app.middleware.auth import get_current_user, require_role

router = APIRouter(prefix="/medical-records", tags=["Medical Records"])


@router.get("/", response_model=List[MedicalRecordResponse])
def list_records(
    patient_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(MedicalRecord).options(joinedload(MedicalRecord.prescriptions))

    if current_user.role == "patient":
        q = q.filter(MedicalRecord.patient_id == current_user.linked_patient_id)
    elif current_user.role == "doctor":
        q = q.filter(MedicalRecord.doctor_id == current_user.linked_doctor_id)
    elif patient_id:
        q = q.filter(MedicalRecord.patient_id == patient_id)

    return q.order_by(MedicalRecord.record_date.desc()).offset(skip).limit(limit).all()


@router.get("/{record_id}", response_model=MedicalRecordResponse)
def get_record(
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.query(MedicalRecord).options(
        joinedload(MedicalRecord.prescriptions)
    ).filter(MedicalRecord.record_id == record_id).first()

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    if current_user.role == "patient" and record.patient_id != current_user.linked_patient_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.role == "doctor" and record.doctor_id != current_user.linked_doctor_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return record


@router.post("/", response_model=MedicalRecordResponse, status_code=status.HTTP_201_CREATED)
def create_record(
    payload: MedicalRecordCreate,
    current_user: User = Depends(require_role("doctor", "admin")),
    db: Session = Depends(get_db),
):
    if current_user.role == "doctor":
        payload_dict = payload.model_dump()
        payload_dict["doctor_id"] = current_user.linked_doctor_id
    else:
        payload_dict = payload.model_dump()

    record = MedicalRecord(**payload_dict)
    db.add(record)
    db.commit()
    db.refresh(record)
    return db.query(MedicalRecord).options(
        joinedload(MedicalRecord.prescriptions)
    ).filter(MedicalRecord.record_id == record.record_id).first()


@router.put("/{record_id}", response_model=MedicalRecordResponse)
def update_record(
    record_id: int,
    payload: MedicalRecordUpdate,
    current_user: User = Depends(require_role("doctor", "admin")),
    db: Session = Depends(get_db),
):
    record = db.query(MedicalRecord).filter(MedicalRecord.record_id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    if current_user.role == "doctor" and record.doctor_id != current_user.linked_doctor_id:
        raise HTTPException(status_code=403, detail="Access denied")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return db.query(MedicalRecord).options(
        joinedload(MedicalRecord.prescriptions)
    ).filter(MedicalRecord.record_id == record_id).first()


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(
    record_id: int,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    record = db.query(MedicalRecord).filter(MedicalRecord.record_id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(record)
    db.commit()


# ── Prescriptions ─────────────────────────────────────────────────────────────
@router.post("/{record_id}/prescriptions", response_model=PrescriptionResponse, status_code=201)
def add_prescription(
    record_id: int,
    payload: PrescriptionCreate,
    current_user: User = Depends(require_role("doctor", "admin")),
    db: Session = Depends(get_db),
):
    record = db.query(MedicalRecord).filter(MedicalRecord.record_id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    if current_user.role == "doctor" and record.doctor_id != current_user.linked_doctor_id:
        raise HTTPException(status_code=403, detail="Access denied")

    rx = Prescription(**{**payload.model_dump(), "record_id": record_id})
    db.add(rx)
    db.commit()
    db.refresh(rx)
    return rx


@router.put("/prescriptions/{prescription_id}", response_model=PrescriptionResponse)
def update_prescription(
    prescription_id: int,
    payload: PrescriptionUpdate,
    current_user: User = Depends(require_role("doctor", "admin")),
    db: Session = Depends(get_db),
):
    rx = db.query(Prescription).filter(Prescription.prescription_id == prescription_id).first()
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(rx, field, value)
    db.commit()
    db.refresh(rx)
    return rx


@router.delete("/prescriptions/{prescription_id}", status_code=204)
def delete_prescription(
    prescription_id: int,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    rx = db.query(Prescription).filter(Prescription.prescription_id == prescription_id).first()
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")
    db.delete(rx)
    db.commit()
