from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import date, time, datetime
from decimal import Decimal


# ── Auth ──────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    username: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str
    linked_patient_id: Optional[int] = None
    linked_doctor_id:  Optional[int] = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        if v not in ("admin", "doctor", "patient"):
            raise ValueError("role must be admin, doctor, or patient")
        return v

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ── Patient ───────────────────────────────────────────────────────────────────
class PatientBase(BaseModel):
    first_name:        str
    last_name:         str
    date_of_birth:     date
    gender:            str
    phone_number:      str
    email:             EmailStr
    address:           Optional[str] = None
    insurance_details: Optional[str] = None
    emergency_contact: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class PatientUpdate(BaseModel):
    first_name:        Optional[str]      = None
    last_name:         Optional[str]      = None
    date_of_birth:     Optional[date]     = None
    gender:            Optional[str]      = None
    phone_number:      Optional[str]      = None
    email:             Optional[EmailStr] = None
    address:           Optional[str]      = None
    insurance_details: Optional[str]      = None
    emergency_contact: Optional[str]      = None

class PatientResponse(PatientBase):
    patient_id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# ── Doctor ────────────────────────────────────────────────────────────────────
class DoctorBase(BaseModel):
    first_name:          str
    last_name:           str
    specialization:      str
    license_number:      str
    experience:          Optional[int] = None
    contact_number:      str
    email:               EmailStr
    availability_status: Optional[str] = "Available"

class DoctorCreate(DoctorBase):
    pass

class DoctorUpdate(BaseModel):
    first_name:          Optional[str]      = None
    last_name:           Optional[str]      = None
    specialization:      Optional[str]      = None
    experience:          Optional[int]      = None
    contact_number:      Optional[str]      = None
    email:               Optional[EmailStr] = None
    availability_status: Optional[str]      = None

class DoctorResponse(DoctorBase):
    doctor_id: int
    class Config:
        from_attributes = True


# ── Appointment ───────────────────────────────────────────────────────────────
class AppointmentBase(BaseModel):
    patient_id:       int
    doctor_id:        int
    appointment_date: date
    appointment_time: time
    reason_for_visit: Optional[str] = None
    notes:            Optional[str] = None

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    appointment_date: Optional[date] = None
    appointment_time: Optional[time] = None
    status:           Optional[str]  = None
    reason_for_visit: Optional[str]  = None
    notes:            Optional[str]  = None

class AppointmentResponse(AppointmentBase):
    appointment_id: int
    status:         str
    created_at:     Optional[datetime] = None
    # nested
    patient_name:   Optional[str] = None
    doctor_name:    Optional[str] = None
    class Config:
        from_attributes = True


# ── Medical Record ────────────────────────────────────────────────────────────
class MedicalRecordBase(BaseModel):
    patient_id:       int
    doctor_id:        int
    diagnosis:        str
    allergies:        Optional[str] = None
    treatment_history:Optional[str] = None
    medical_notes:    Optional[str] = None
    record_date:      Optional[date] = None

class MedicalRecordCreate(MedicalRecordBase):
    pass

class MedicalRecordUpdate(BaseModel):
    diagnosis:        Optional[str]  = None
    allergies:        Optional[str]  = None
    treatment_history:Optional[str]  = None
    medical_notes:    Optional[str]  = None

class MedicalRecordResponse(MedicalRecordBase):
    record_id:    int
    created_at:   Optional[datetime] = None
    updated_at:   Optional[datetime] = None
    prescriptions: Optional[List["PrescriptionResponse"]] = []
    class Config:
        from_attributes = True


# ── Prescription ──────────────────────────────────────────────────────────────
class PrescriptionBase(BaseModel):
    record_id:       int
    medication_name: str
    dosage:          str
    frequency:       str
    duration:        str
    instructions:    Optional[str] = None

class PrescriptionCreate(PrescriptionBase):
    pass

class PrescriptionUpdate(BaseModel):
    medication_name: Optional[str] = None
    dosage:          Optional[str] = None
    frequency:       Optional[str] = None
    duration:        Optional[str] = None
    instructions:    Optional[str] = None

class PrescriptionResponse(PrescriptionBase):
    prescription_id: int
    created_at:      Optional[datetime] = None
    class Config:
        from_attributes = True


# ── Billing ───────────────────────────────────────────────────────────────────
class BillingBase(BaseModel):
    patient_id:          int
    appointment_id:      Optional[int]     = None
    service_description: str
    charges:             Decimal
    insurance_claim:     Optional[Decimal] = Decimal("0")
    amount_paid:         Optional[Decimal] = Decimal("0")
    payment_status:      Optional[str]     = "Pending"
    billing_date:        Optional[date]    = None

class BillingCreate(BillingBase):
    pass

class BillingUpdate(BaseModel):
    service_description: Optional[str]     = None
    charges:             Optional[Decimal] = None
    insurance_claim:     Optional[Decimal] = None
    amount_paid:         Optional[Decimal] = None
    payment_status:      Optional[str]     = None

class BillingResponse(BillingBase):
    bill_id:    int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# ── Dashboard / Analytics ─────────────────────────────────────────────────────
class DashboardStats(BaseModel):
    total_patients:      int
    total_doctors:       int
    total_appointments:  int
    todays_appointments: int
    pending_bills:       float
    total_revenue:       float
    completed_visits:    int
    scheduled:           int

class RevenueData(BaseModel):
    month:           str
    total_charged:   float
    total_collected: float
    outstanding:     float

MedicalRecordResponse.model_rebuild()
