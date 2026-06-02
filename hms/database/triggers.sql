-- ============================================================
-- Healthcare Management System - Triggers & Functions
-- ============================================================

-- ============================================================
-- TRIGGER 1: Audit log on medical_records UPDATE
-- ============================================================
CREATE OR REPLACE FUNCTION trg_audit_medical_records()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (table_name, operation, record_id, old_data, new_data)
    VALUES (
        'medical_records',
        TG_OP,
        NEW.record_id,
        to_jsonb(OLD),
        to_jsonb(NEW)
    );
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_medical_records ON medical_records;
CREATE TRIGGER audit_medical_records
    BEFORE UPDATE ON medical_records
    FOR EACH ROW EXECUTE FUNCTION trg_audit_medical_records();

-- ============================================================
-- TRIGGER 2: Auto-update appointment status based on date/time
-- ============================================================
CREATE OR REPLACE FUNCTION trg_update_appointment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If appointment datetime has passed and status is still Scheduled, mark as No-Show
    IF (NEW.appointment_date < CURRENT_DATE OR 
        (NEW.appointment_date = CURRENT_DATE AND NEW.appointment_time < CURRENT_TIME))
       AND NEW.status = 'Scheduled' THEN
        NEW.status := 'No-Show';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_appointment_status ON appointments;
CREATE TRIGGER update_appointment_status
    BEFORE INSERT OR UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION trg_update_appointment_status();

-- ============================================================
-- TRIGGER 3: Auto-generate billing after appointment completion
-- ============================================================
CREATE OR REPLACE FUNCTION trg_generate_billing_on_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- When appointment is marked Completed, auto-create a billing record if none exists
    IF NEW.status = 'Completed' AND OLD.status <> 'Completed' THEN
        IF NOT EXISTS (
            SELECT 1 FROM billing WHERE appointment_id = NEW.appointment_id
        ) THEN
            INSERT INTO billing (patient_id, appointment_id, service_description, charges, payment_status, billing_date)
            VALUES (
                NEW.patient_id,
                NEW.appointment_id,
                'Consultation Fee',
                150.00,
                'Pending',
                CURRENT_DATE
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generate_billing_on_completion ON appointments;
CREATE TRIGGER generate_billing_on_completion
    AFTER UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION trg_generate_billing_on_completion();

-- ============================================================
-- TRIGGER 4: Audit log on patients UPDATE
-- ============================================================
CREATE OR REPLACE FUNCTION trg_audit_patients()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (table_name, operation, record_id, old_data, new_data)
    VALUES ('patients', TG_OP, NEW.patient_id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_patients ON patients;
CREATE TRIGGER audit_patients
    AFTER UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION trg_audit_patients();
