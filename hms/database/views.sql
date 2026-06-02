-- ============================================================
-- Healthcare Management System - Database Views
-- ============================================================

-- ============================================================
-- VIEW 1: USER_VIEW (Patient-facing - own data only)
-- ============================================================
CREATE OR REPLACE VIEW user_view AS
SELECT
    -- Personal Details
    p.patient_id,
    p.first_name,
    p.last_name,
    p.date_of_birth,
    p.gender,
    p.phone_number,
    p.email,
    p.address,
    p.insurance_details,
    p.emergency_contact,
    -- Appointment History
    a.appointment_id,
    a.appointment_date,
    a.appointment_time,
    a.status AS appointment_status,
    a.reason_for_visit,
    a.notes AS appointment_notes,
    (d.first_name || ' ' || d.last_name) AS doctor_name,
    d.specialization,
    -- Diagnosis
    mr.record_id,
    mr.diagnosis,
    mr.allergies,
    mr.treatment_history,
    mr.medical_notes,
    mr.record_date,
    -- Prescribed Medications
    pr.prescription_id,
    pr.medication_name,
    pr.dosage,
    pr.frequency,
    pr.duration,
    pr.instructions,
    -- Billing Information
    b.bill_id,
    b.service_description,
    b.charges,
    b.insurance_claim,
    b.amount_paid,
    b.payment_status,
    b.billing_date
FROM patients p
LEFT JOIN appointments a ON a.patient_id = p.patient_id
LEFT JOIN doctors d ON d.doctor_id = a.doctor_id
LEFT JOIN medical_records mr ON mr.patient_id = p.patient_id
LEFT JOIN prescriptions pr ON pr.record_id = mr.record_id
LEFT JOIN billing b ON b.patient_id = p.patient_id;

-- ============================================================
-- VIEW 2: ADMIN_VIEW (Full administrative access)
-- ============================================================
CREATE OR REPLACE VIEW admin_view AS
SELECT
    -- Patient Info
    p.patient_id,
    p.first_name        AS patient_first_name,
    p.last_name         AS patient_last_name,
    p.date_of_birth,
    p.gender,
    p.phone_number      AS patient_phone,
    p.email             AS patient_email,
    p.insurance_details,
    -- Doctor Info
    d.doctor_id,
    d.first_name        AS doctor_first_name,
    d.last_name         AS doctor_last_name,
    d.specialization,
    d.license_number,
    d.experience,
    d.availability_status,
    -- Appointment Info
    a.appointment_id,
    a.appointment_date,
    a.appointment_time,
    a.status            AS appointment_status,
    a.reason_for_visit,
    -- Medical Records
    mr.record_id,
    mr.diagnosis,
    mr.allergies,
    mr.treatment_history,
    mr.record_date,
    -- Prescriptions
    pr.prescription_id,
    pr.medication_name,
    pr.dosage,
    pr.frequency,
    pr.duration,
    -- Billing Statistics
    b.bill_id,
    b.service_description,
    b.charges,
    b.insurance_claim,
    b.amount_paid,
    b.payment_status,
    b.billing_date,
    -- Revenue Summary fields
    (b.charges - b.amount_paid) AS outstanding_balance
FROM patients p
LEFT JOIN appointments a ON a.patient_id = p.patient_id
LEFT JOIN doctors d ON d.doctor_id = a.doctor_id
LEFT JOIN medical_records mr ON mr.patient_id = p.patient_id
LEFT JOIN prescriptions pr ON pr.record_id = mr.record_id
LEFT JOIN billing b ON b.patient_id = p.patient_id;
