-- ============================================================
-- Healthcare Management System - SQL Roles & Privileges
-- ============================================================

-- Create roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hms_admin') THEN
        CREATE ROLE hms_admin LOGIN PASSWORD 'admin_secure_pass';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hms_doctor') THEN
        CREATE ROLE hms_doctor LOGIN PASSWORD 'doctor_secure_pass';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hms_patient') THEN
        CREATE ROLE hms_patient LOGIN PASSWORD 'patient_secure_pass';
    END IF;
END
$$;

-- ============================================================
-- ADMIN: Full CRUD on all tables
-- ============================================================
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hms_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO hms_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO hms_admin;
GRANT EXECUTE ON ALL PROCEDURES IN SCHEMA public TO hms_admin;

-- ============================================================
-- DOCTOR: CREATE/UPDATE/VIEW on medical data, NO billing DELETE
-- ============================================================
GRANT SELECT ON patients, appointments, medical_records, prescriptions, billing, doctors TO hms_doctor;
GRANT INSERT, UPDATE ON medical_records, prescriptions TO hms_doctor;
GRANT INSERT, UPDATE ON appointments TO hms_doctor;
GRANT USAGE ON SEQUENCE medical_records_record_id_seq TO hms_doctor;
GRANT USAGE ON SEQUENCE prescriptions_prescription_id_seq TO hms_doctor;
GRANT USAGE ON SEQUENCE appointments_appointment_id_seq TO hms_doctor;
-- Revoke destructive billing ops
REVOKE DELETE ON billing FROM hms_doctor;

-- ============================================================
-- PATIENT: READ ONLY on own data (enforced via RLS)
-- ============================================================
GRANT SELECT ON user_view TO hms_patient;
GRANT SELECT ON appointments, medical_records, prescriptions, billing, patients TO hms_patient;
REVOKE INSERT, UPDATE, DELETE ON medical_records, prescriptions, billing, appointments FROM hms_patient;

-- ============================================================
-- Row-Level Security for patients
-- ============================================================
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;

-- Patients see only their own rows
CREATE POLICY patient_self_policy ON patients
    FOR SELECT TO hms_patient
    USING (patient_id = current_setting('app.current_patient_id', true)::INTEGER);

CREATE POLICY patient_records_policy ON medical_records
    FOR SELECT TO hms_patient
    USING (patient_id = current_setting('app.current_patient_id', true)::INTEGER);

CREATE POLICY patient_appt_policy ON appointments
    FOR SELECT TO hms_patient
    USING (patient_id = current_setting('app.current_patient_id', true)::INTEGER);

CREATE POLICY patient_billing_policy ON billing
    FOR SELECT TO hms_patient
    USING (patient_id = current_setting('app.current_patient_id', true)::INTEGER);
