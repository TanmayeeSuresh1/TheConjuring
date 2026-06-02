from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date

from app.core.database import get_db
from app.models.models import Appointment, Patient, Doctor, User
from app.schemas.schemas import AppointmentCreate, AppointmentUpdate, AppointmentResponse
from app.middleware.auth import get_current_user, require_role

router = APIRouter(prefix="/appointments", tags=["Appointments"])


def _enrich(appt: Appointment) -> dict:
    data = {c.name: getattr(appt, c.name) for c in appt.__table__.columns}
    data["patient_name"] = f"{appt.patient.first_name} {appt.patient.last_name}" if appt.patient else None
    data["doctor_name"]  = f"{appt.doctor.first_name} {appt.doctor.last_name}"   if appt.doctor  else None
    return data


@router.get("/", response_model=List[AppointmentResponse])
def list_appointments(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[str]  = Query(None, alias="status"),
    date_from:     Optional[date] = Query(None),
    date_to:       Optional[date] = Query(None),
    doctor_id:     Optional[int]  = Query(None),
    patient_id:    Optional[int]  = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Appointment).options(
        joinedload(Appointment.patient), joinedload(Appointment.doctor)
    )
    # Scope by role
    if current_user.role == "patient":
        q = q.filter(Appointment.patient_id == current_user.linked_patient_id)
    elif current_user.role == "doctor":
        q = q.filter(Appointment.doctor_id == current_user.linked_doctor_id)

    if status_filter:
        q = q.filter(Appointment.status == status_filter)
    if date_from:
        q = q.filter(Appointment.appointment_date >= date_from)
    if date_to:
        q = q.filter(Appointment.appointment_date <= date_to)
    if doctor_id and current_user.role == "admin":
        q = q.filter(Appointment.doctor_id == doctor_id)
    if patient_id and current_user.role in ("admin", "doctor"):
        q = q.filter(Appointment.patient_id == patient_id)

    appointments = q.order_by(Appointment.appointment_date.desc()).offset(skip).limit(limit).all()
    return [_enrich(a) for a in appointments]


@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    appt = db.query(Appointment).options(
        joinedload(Appointment.patient), joinedload(Appointment.doctor)
    ).filter(Appointment.appointment_id == appointment_id).first()

    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Authorization checks
    if current_user.role == "patient" and appt.patient_id != current_user.linked_patient_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.role == "doctor" and appt.doctor_id != current_user.linked_doctor_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return _enrich(appt)


@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(
    payload: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Patients can only book for themselves
    if current_user.role == "patient" and payload.patient_id != current_user.linked_patient_id:
        raise HTTPException(status_code=403, detail="Cannot book appointment for another patient")

    # Check conflict
    conflict = db.query(Appointment).filter(
        Appointment.doctor_id        == payload.doctor_id,
        Appointment.appointment_date == payload.appointment_date,
        Appointment.appointment_time == payload.appointment_time,
        Appointment.status.notin_(["Cancelled"]),
    ).first()
    if conflict:
        raise HTTPException(status_code=409, detail="Time slot already booked")

    # Validate doctor availability
    doctor = db.query(Doctor).filter(Doctor.doctor_id == payload.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    if doctor.availability_status != "Available":
        raise HTTPException(status_code=400, detail="Doctor is not available")

    appt = Appointment(**payload.model_dump())
    db.add(appt)
    db.commit()
    db.refresh(appt)

    # Reload with relationships
    appt = db.query(Appointment).options(
        joinedload(Appointment.patient), joinedload(Appointment.doctor)
    ).filter(Appointment.appointment_id == appt.appointment_id).first()
    return _enrich(appt)


@router.put("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(
    appointment_id: int,
    payload: AppointmentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    appt = db.query(Appointment).filter(Appointment.appointment_id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if current_user.role == "patient":
        # Patients can only cancel their own
        if appt.patient_id != current_user.linked_patient_id:
            raise HTTPException(status_code=403, detail="Access denied")
        allowed = {"status"}
        payload_dict = {k: v for k, v in payload.model_dump(exclude_none=True).items() if k in allowed}
        if payload_dict.get("status") not in ("Cancelled", None):
            raise HTTPException(status_code=403, detail="Patients can only cancel appointments")
    elif current_user.role == "doctor":
        if appt.doctor_id != current_user.linked_doctor_id:
            raise HTTPException(status_code=403, detail="Access denied")
        payload_dict = payload.model_dump(exclude_none=True)
    else:
        payload_dict = payload.model_dump(exclude_none=True)

    for field, value in payload_dict.items():
        setattr(appt, field, value)
    db.commit()
    db.refresh(appt)

    appt = db.query(Appointment).options(
        joinedload(Appointment.patient), joinedload(Appointment.doctor)
    ).filter(Appointment.appointment_id == appointment_id).first()
    return _enrich(appt)


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(
    appointment_id: int,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    appt = db.query(Appointment).filter(Appointment.appointment_id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    db.delete(appt)
    db.commit()
