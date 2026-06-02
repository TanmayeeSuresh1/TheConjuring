from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import List, Optional
from datetime import date

from app.core.database import get_db
from app.models.models import Billing, User
from app.schemas.schemas import BillingCreate, BillingUpdate, BillingResponse
from app.middleware.auth import get_current_user, require_role

router = APIRouter(prefix="/billing", tags=["Billing"])


@router.get("/", response_model=List[BillingResponse])
def list_bills(
    patient_id:     Optional[int]  = Query(None),
    payment_status: Optional[str]  = Query(None),
    date_from:      Optional[date] = Query(None),
    date_to:        Optional[date] = Query(None),
    skip:  int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Billing)
    if current_user.role == "patient":
        q = q.filter(Billing.patient_id == current_user.linked_patient_id)
    elif patient_id:
        q = q.filter(Billing.patient_id == patient_id)
    if payment_status:
        q = q.filter(Billing.payment_status == payment_status)
    if date_from:
        q = q.filter(Billing.billing_date >= date_from)
    if date_to:
        q = q.filter(Billing.billing_date <= date_to)
    return q.order_by(Billing.billing_date.desc()).offset(skip).limit(limit).all()


@router.get("/stats")
def billing_stats(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    result = db.execute(text("SELECT * FROM get_revenue_summary()")).fetchone()
    return dict(result._mapping)


@router.get("/revenue-by-month")
def revenue_by_month(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    rows = db.execute(text("""
        SELECT TO_CHAR(billing_date, 'YYYY-MM') AS month,
               COUNT(*) AS total_bills,
               SUM(charges) AS total_charged,
               SUM(amount_paid) AS total_collected,
               SUM(charges - amount_paid) AS outstanding
        FROM billing
        GROUP BY TO_CHAR(billing_date, 'YYYY-MM')
        ORDER BY month DESC
        LIMIT 12
    """)).fetchall()
    return [dict(r._mapping) for r in rows]


@router.get("/{bill_id}", response_model=BillingResponse)
def get_bill(
    bill_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bill = db.query(Billing).filter(Billing.bill_id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    if current_user.role == "patient" and bill.patient_id != current_user.linked_patient_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return bill


@router.post("/", response_model=BillingResponse, status_code=status.HTTP_201_CREATED)
def create_bill(
    payload: BillingCreate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    bill = Billing(**payload.model_dump())
    db.add(bill)
    db.commit()
    db.refresh(bill)
    return bill


@router.put("/{bill_id}", response_model=BillingResponse)
def update_bill(
    bill_id: int,
    payload: BillingUpdate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    bill = db.query(Billing).filter(Billing.bill_id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(bill, field, value)
    db.commit()
    db.refresh(bill)
    return bill


@router.delete("/{bill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bill(
    bill_id: int,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    # Doctors cannot delete billing - enforced here and at DB level
    bill = db.query(Billing).filter(Billing.bill_id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    db.delete(bill)
    db.commit()
