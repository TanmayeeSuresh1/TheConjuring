from sqlalchemy import (
    Column, Integer, String, Date, Time, Text, Numeric,
    Boolean, DateTime, ForeignKey, CheckConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Patient(Base):
    __tablename__ = "patients"

    patient_id        = Column(Integer, primary_key=True, index=True)
    first_name        = Column(String(100), nullable=False)
    last_name         = Column(String(100), nullable=False)
    date_of_birth     = Column(Date, nullable=False)
    gender            = Column(String(10), nullable=False)
    phone_number      = Column(String(20), unique=True, nullable=False)
    email             = Column(String(150), unique=True, nullable=False)
    address           = Column(Text)
    insurance_details = Column(Text)
    emergency_contact = Column(String(200))
    created_at        = Column(DateTime, server_default=func.now())

    appointments    = relationship("Appointment", back_populates="patient", cascade="all, delete")
    medical_records = relationship("MedicalRecord", back_populates="patient", cascade="all, delete")
    billing         = relationship("Billing", back_populates="patient", cascade="all, delete")
    user            = relationship("User", back_populates="patient", uselist=False)


class Doctor(Base):
    __tablename__ = "doctors"

    doctor_id           = Column(Integer, primary_key=True, index=True)
    first_name          = Column(String(100), nullable=False)
    last_name           = Column(String(100), nullable=False)
    specialization      = Column(String(150), nullable=False)
    license_number      = Column(String(50), unique=True, nullable=False)
    experience          = Column(Integer)
    contact_number      = Column(String(20), unique=True, nullable=False)
    email               = Column(String(150), unique=True, nullable=False)
    availability_status = Column(String(20), default="Available")

    appointments    = relationship("Appointment", back_populates="doctor")
    medical_records = relationship("MedicalRecord", back_populates="doctor")
    user            = relationship("User", back_populates="doctor", uselist=False)


class User(Base):
    __tablename__ = "users"

    user_id           = Column(Integer, primary_key=True, index=True)
    username          = Column(String(100), unique=True, nullable=False)
    password_hash     = Column(Text, nullable=False)
    role              = Column(String(20), nullable=False)
    linked_patient_id = Column(Integer, ForeignKey("patients.patient_id", ondelete="SET NULL"), nullable=True)
    linked_doctor_id  = Column(Integer, ForeignKey("doctors.doctor_id",  ondelete="SET NULL"), nullable=True)
    is_active         = Column(Boolean, default=True)
    created_at        = Column(DateTime, server_default=func.now())
    last_login        = Column(DateTime, nullable=True)

    patient = relationship("Patient", back_populates="user")
    doctor  = relationship("Doctor",  back_populates="user")


class Appointment(Base):
    __tablename__ = "appointments"

    appointment_id   = Column(Integer, primary_key=True, index=True)
    patient_id       = Column(Integer, ForeignKey("patients.patient_id", ondelete="CASCADE"), nullable=False)
    doctor_id        = Column(Integer, ForeignKey("doctors.doctor_id",   ondelete="CASCADE"), nullable=False)
    appointment_date = Column(Date, nullable=False)
    appointment_time = Column(Time, nullable=False)
    status           = Column(String(20), default="Scheduled")
    reason_for_visit = Column(Text)
    notes            = Column(Text)
    created_at       = Column(DateTime, server_default=func.now())

    patient = relationship("Patient", back_populates="appointments")
    doctor  = relationship("Doctor",  back_populates="appointments")
    billing = relationship("Billing", back_populates="appointment", uselist=False)


class MedicalRecord(Base):
    __tablename__ = "medical_records"

    record_id         = Column(Integer, primary_key=True, index=True)
    patient_id        = Column(Integer, ForeignKey("patients.patient_id", ondelete="CASCADE"), nullable=False)
    doctor_id         = Column(Integer, ForeignKey("doctors.doctor_id"), nullable=False)
    diagnosis         = Column(Text, nullable=False)
    allergies         = Column(Text)
    treatment_history = Column(Text)
    medical_notes     = Column(Text)
    record_date       = Column(Date, nullable=False, server_default=func.current_date())
    created_at        = Column(DateTime, server_default=func.now())
    updated_at        = Column(DateTime, server_default=func.now(), onupdate=func.now())

    patient       = relationship("Patient", back_populates="medical_records")
    doctor        = relationship("Doctor",  back_populates="medical_records")
    prescriptions = relationship("Prescription", back_populates="record", cascade="all, delete")


class Prescription(Base):
    __tablename__ = "prescriptions"

    prescription_id = Column(Integer, primary_key=True, index=True)
    record_id       = Column(Integer, ForeignKey("medical_records.record_id", ondelete="CASCADE"), nullable=False)
    medication_name = Column(String(200), nullable=False)
    dosage          = Column(String(100), nullable=False)
    frequency       = Column(String(100), nullable=False)
    duration        = Column(String(100), nullable=False)
    instructions    = Column(Text)
    created_at      = Column(DateTime, server_default=func.now())

    record = relationship("MedicalRecord", back_populates="prescriptions")


class Billing(Base):
    __tablename__ = "billing"

    bill_id             = Column(Integer, primary_key=True, index=True)
    patient_id          = Column(Integer, ForeignKey("patients.patient_id", ondelete="CASCADE"), nullable=False)
    appointment_id      = Column(Integer, ForeignKey("appointments.appointment_id", ondelete="SET NULL"), nullable=True)
    service_description = Column(Text, nullable=False)
    charges             = Column(Numeric(10, 2), nullable=False)
    insurance_claim     = Column(Numeric(10, 2), default=0)
    amount_paid         = Column(Numeric(10, 2), default=0)
    payment_status      = Column(String(20), default="Pending")
    billing_date        = Column(Date, nullable=False, server_default=func.current_date())
    created_at          = Column(DateTime, server_default=func.now())

    patient     = relationship("Patient",     back_populates="billing")
    appointment = relationship("Appointment", back_populates="billing")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id     = Column(Integer, primary_key=True, index=True)
    table_name = Column(String(100), nullable=False)
    operation  = Column(String(20),  nullable=False)
    record_id  = Column(Integer)
    changed_by = Column(String(150))
    old_data   = Column(Text)
    new_data   = Column(Text)
    changed_at = Column(DateTime, server_default=func.now())
