from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import date

from app.core.database import get_db
from app.models.models import Patient, Doctor, Appointment, Billing, MedicalRecord, User
from app.schemas.schemas import DashboardStats
from app.middleware.auth import get_current_user, require_role

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    today = date.today()

    total_patients     = db.query(func.count(Patient.patient_id)).scalar()
    total_doctors      = db.query(func.count(Doctor.doctor_id)).scalar()
    total_appointments = db.query(func.count(Appointment.appointment_id)).scalar()
    todays_appts       = db.query(func.count(Appointment.appointment_id)).filter(
        Appointment.appointment_date == today
    ).scalar()
    completed_visits   = db.query(func.count(Appointment.appointment_id)).filter(
        Appointment.status == "Completed"
    ).scalar()
    scheduled          = db.query(func.count(Appointment.appointment_id)).filter(
        Appointment.status == "Scheduled"
    ).scalar()

    revenue_row = db.execute(text("SELECT * FROM get_revenue_summary()")).fetchone()
    total_revenue = float(revenue_row._mapping["total_collected"]) if revenue_row else 0
    pending_bills = float(revenue_row._mapping["total_pending"])   if revenue_row else 0

    return DashboardStats(
        total_patients=total_patients,
        total_doctors=total_doctors,
        total_appointments=total_appointments,
        todays_appointments=todays_appts,
        pending_bills=pending_bills,
        total_revenue=total_revenue,
        completed_visits=completed_visits,
        scheduled=scheduled,
    )


@router.get("/doctor-stats")
def get_doctor_stats(
    current_user: User = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
):
    doctor_id = current_user.linked_doctor_id
    today     = date.today()

    total_appts   = db.query(func.count(Appointment.appointment_id)).filter(
        Appointment.doctor_id == doctor_id
    ).scalar()
    todays_appts  = db.query(func.count(Appointment.appointment_id)).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.appointment_date == today,
    ).scalar()
    total_patients = db.query(func.count(func.distinct(Appointment.patient_id))).filter(
        Appointment.doctor_id == doctor_id
    ).scalar()
    total_records  = db.query(func.count(MedicalRecord.record_id)).filter(
        MedicalRecord.doctor_id == doctor_id
    ).scalar()
    upcoming = db.query(func.count(Appointment.appointment_id)).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.appointment_date >= today,
        Appointment.status == "Scheduled",
    ).scalar()

    return {
        "total_appointments": total_appts,
        "todays_appointments": todays_appts,
        "total_patients": total_patients,
        "total_records": total_records,
        "upcoming_appointments": upcoming,
    }


@router.get("/patient-stats")
def get_patient_stats(
    current_user: User = Depends(require_role("patient")),
    db: Session = Depends(get_db),
):
    patient_id = current_user.linked_patient_id
    today      = date.today()

    total_appts = db.query(func.count(Appointment.appointment_id)).filter(
        Appointment.patient_id == patient_id
    ).scalar()
    upcoming = db.query(func.count(Appointment.appointment_id)).filter(
        Appointment.patient_id == patient_id,
        Appointment.appointment_date >= today,
        Appointment.status == "Scheduled",
    ).scalar()
    total_records = db.query(func.count(MedicalRecord.record_id)).filter(
        MedicalRecord.patient_id == patient_id
    ).scalar()
    pending_bills = db.query(func.count(Billing.bill_id)).filter(
        Billing.patient_id == patient_id,
        Billing.payment_status.in_(["Pending", "Partial"]),
    ).scalar()
    total_due = db.query(func.coalesce(func.sum(Billing.charges - Billing.amount_paid), 0)).filter(
        Billing.patient_id == patient_id,
        Billing.payment_status.in_(["Pending", "Partial"]),
    ).scalar()

    return {
        "total_appointments": total_appts,
        "upcoming_appointments": upcoming,
        "total_records": total_records,
        "pending_bills": pending_bills,
        "total_due": float(total_due),
    }


@router.get("/appointment-trends")
def appointment_trends(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    rows = db.execute(text("""
        SELECT TO_CHAR(appointment_date, 'Mon YYYY') AS month,
               COUNT(*) AS total,
               COUNT(*) FILTER (WHERE status='Completed') AS completed,
               COUNT(*) FILTER (WHERE status='Cancelled') AS cancelled
        FROM appointments
        GROUP BY TO_CHAR(appointment_date, 'Mon YYYY'), DATE_TRUNC('month', appointment_date)
        ORDER BY DATE_TRUNC('month', appointment_date) DESC
        LIMIT 6
    """)).fetchall()
    return [dict(r._mapping) for r in rows]


@router.get("/specialization-distribution")
def specialization_distribution(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    rows = db.execute(text("""
        SELECT d.specialization, COUNT(a.appointment_id) AS count
        FROM doctors d
        LEFT JOIN appointments a ON a.doctor_id = d.doctor_id
        GROUP BY d.specialization
        ORDER BY count DESC
    """)).fetchall()
    return [dict(r._mapping) for r in rows]


@router.get("/audit-logs")
def get_audit_logs(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    rows = db.execute(text("""
        SELECT * FROM audit_logs ORDER BY changed_at DESC LIMIT :limit OFFSET :skip
    """), {"limit": limit, "skip": skip}).fetchall()
    return [dict(r._mapping) for r in rows]
