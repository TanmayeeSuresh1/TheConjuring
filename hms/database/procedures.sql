-- ============================================================
-- Healthcare Management System - Stored Procedures & Functions
-- ============================================================

-- ============================================================
-- PROCEDURE 1: Schedule Appointment
-- ============================================================
CREATE OR REPLACE PROCEDURE schedule_appointment(
    p_patient_id    INTEGER,
    p_doctor_id     INTEGER,
    p_date          DATE,
    p_time          TIME,
    p_reason        TEXT,
    p_notes         TEXT DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE
    conflict_count INTEGER;
BEGIN
    -- Check for scheduling conflicts
    SELECT COUNT(*) INTO conflict_count
    FROM appointments
    WHERE doctor_id = p_doctor_id
      AND appointment_date = p_date
      AND appointment_time = p_time
      AND status NOT IN ('Cancelled');

    IF conflict_count > 0 THEN
        RAISE EXCEPTION 'Doctor already has an appointment at this time slot.';
    END IF;

    -- Check doctor availability
    IF NOT EXISTS (SELECT 1 FROM doctors WHERE doctor_id = p_doctor_id AND availability_status = 'Available') THEN
        RAISE EXCEPTION 'Doctor is not available for appointments.';
    END IF;

    -- Insert appointment
    INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, reason_for_visit, notes, status)
    VALUES (p_patient_id, p_doctor_id, p_date, p_time, p_reason, p_notes, 'Scheduled');

    RAISE NOTICE 'Appointment scheduled successfully.';
END;
$$;

-- ============================================================
-- FUNCTION 2: Generate Patient Medical Summary
-- ============================================================
CREATE OR REPLACE FUNCTION get_patient_medical_summary(p_patient_id INTEGER)
RETURNS TABLE (
    patient_name        TEXT,
    date_of_birth       DATE,
    gender              VARCHAR,
    total_appointments  BIGINT,
    completed_visits    BIGINT,
    pending_bills       NUMERIC,
    total_paid          NUMERIC,
    diagnoses           TEXT,
    medications         TEXT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        (p.first_name || ' ' || p.last_name)::TEXT AS patient_name,
        p.date_of_birth,
        p.gender,
        COUNT(DISTINCT a.appointment_id) AS total_appointments,
        COUNT(DISTINCT a.appointment_id) FILTER (WHERE a.status = 'Completed') AS completed_visits,
        COALESCE(SUM(b.charges - b.amount_paid) FILTER (WHERE b.payment_status <> 'Paid'), 0) AS pending_bills,
        COALESCE(SUM(b.amount_paid), 0) AS total_paid,
        COALESCE(STRING_AGG(DISTINCT mr.diagnosis, '; '), 'None') AS diagnoses,
        COALESCE(STRING_AGG(DISTINCT pr.medication_name, ', '), 'None') AS medications
    FROM patients p
    LEFT JOIN appointments a ON a.patient_id = p.patient_id
    LEFT JOIN medical_records mr ON mr.patient_id = p.patient_id
    LEFT JOIN prescriptions pr ON pr.record_id = mr.record_id
    LEFT JOIN billing b ON b.patient_id = p.patient_id
    WHERE p.patient_id = p_patient_id
    GROUP BY p.patient_id, p.first_name, p.last_name, p.date_of_birth, p.gender;
END;
$$;

-- ============================================================
-- FUNCTION: Get Revenue Summary
-- ============================================================
CREATE OR REPLACE FUNCTION get_revenue_summary(
    p_start_date DATE DEFAULT NULL,
    p_end_date   DATE DEFAULT NULL
)
RETURNS TABLE (
    total_billed        NUMERIC,
    total_collected     NUMERIC,
    total_pending       NUMERIC,
    insurance_claimed   NUMERIC,
    total_bills         BIGINT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(charges), 0)         AS total_billed,
        COALESCE(SUM(amount_paid), 0)     AS total_collected,
        COALESCE(SUM(charges - amount_paid), 0) AS total_pending,
        COALESCE(SUM(insurance_claim), 0) AS insurance_claimed,
        COUNT(*)                          AS total_bills
    FROM billing
    WHERE (p_start_date IS NULL OR billing_date >= p_start_date)
      AND (p_end_date   IS NULL OR billing_date <= p_end_date);
END;
$$;
