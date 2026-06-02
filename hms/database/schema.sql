-- ============================================================
-- Healthcare Management System - Complete Database Schema
-- PostgreSQL - Fully Normalized (3NF)
-- ============================================================

-- Create Database (run separately if needed)
-- CREATE DATABASE healthcare_db;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- DROP EXISTING TABLES (for clean reinstall)
-- ============================================================
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS billing CASCADE;
DROP TABLE IF EXISTS prescriptions CASCADE;
DROP TABLE IF EXISTS medical_records CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS patients CASCADE;

-- ============================================================
-- DROP EXISTING VIEWS
-- ============================================================
DROP VIEW IF EXISTS user_view CASCADE;
DROP VIEW IF EXISTS admin_view CASCADE;

-- ============================================================
-- TABLE: patients
-- ============================================================
CREATE TABLE patients (
    patient_id      SERIAL PRIMARY KEY,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    date_of_birth   DATE NOT NULL,
    gender          VARCHAR(10) NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    phone_number    VARCHAR(20) UNIQUE NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    address         TEXT,
    insurance_details TEXT,
    emergency_contact VARCHAR(200),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: doctors
-- ============================================================
CREATE TABLE doctors (
    doctor_id           SERIAL PRIMARY KEY,
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    specialization      VARCHAR(150) NOT NULL,
    license_number      VARCHAR(50) UNIQUE NOT NULL,
    experience          INTEGER CHECK (experience >= 0),
    contact_number      VARCHAR(20) UNIQUE NOT NULL,
    email               VARCHAR(150) UNIQUE NOT NULL,
    availability_status VARCHAR(20) DEFAULT 'Available' CHECK (availability_status IN ('Available', 'Busy', 'On Leave', 'Inactive'))
);

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE users (
    user_id             SERIAL PRIMARY KEY,
    username            VARCHAR(100) UNIQUE NOT NULL,
    password_hash       TEXT NOT NULL,
    role                VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'doctor', 'patient')),
    linked_patient_id   INTEGER REFERENCES patients(patient_id) ON DELETE SET NULL,
    linked_doctor_id    INTEGER REFERENCES doctors(doctor_id) ON DELETE SET NULL,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login          TIMESTAMP,
    CONSTRAINT chk_role_link CHECK (
        (role = 'patient' AND linked_patient_id IS NOT NULL AND linked_doctor_id IS NULL) OR
        (role = 'doctor'  AND linked_doctor_id IS NOT NULL AND linked_patient_id IS NULL) OR
        (role = 'admin'   AND linked_patient_id IS NULL    AND linked_doctor_id IS NULL)
    )
);

-- ============================================================
-- TABLE: appointments
-- ============================================================
CREATE TABLE appointments (
    appointment_id      SERIAL PRIMARY KEY,
    patient_id          INTEGER NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    doctor_id           INTEGER NOT NULL REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    appointment_date    DATE NOT NULL,
    appointment_time    TIME NOT NULL,
    status              VARCHAR(20) DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled', 'No-Show')),
    reason_for_visit    TEXT,
    notes               TEXT,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: medical_records
-- ============================================================
CREATE TABLE medical_records (
    record_id           SERIAL PRIMARY KEY,
    patient_id          INTEGER NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    doctor_id           INTEGER NOT NULL REFERENCES doctors(doctor_id),
    diagnosis           TEXT NOT NULL,
    allergies           TEXT,
    treatment_history   TEXT,
    medical_notes       TEXT,
    record_date         DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: prescriptions
-- ============================================================
CREATE TABLE prescriptions (
    prescription_id     SERIAL PRIMARY KEY,
    record_id           INTEGER NOT NULL REFERENCES medical_records(record_id) ON DELETE CASCADE,
    medication_name     VARCHAR(200) NOT NULL,
    dosage              VARCHAR(100) NOT NULL,
    frequency           VARCHAR(100) NOT NULL,
    duration            VARCHAR(100) NOT NULL,
    instructions        TEXT,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: billing
-- ============================================================
CREATE TABLE billing (
    bill_id             SERIAL PRIMARY KEY,
    patient_id          INTEGER NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    appointment_id      INTEGER REFERENCES appointments(appointment_id) ON DELETE SET NULL,
    service_description TEXT NOT NULL,
    charges             NUMERIC(10,2) NOT NULL CHECK (charges >= 0),
    insurance_claim     NUMERIC(10,2) DEFAULT 0 CHECK (insurance_claim >= 0),
    amount_paid         NUMERIC(10,2) DEFAULT 0 CHECK (amount_paid >= 0),
    payment_status      VARCHAR(20) DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Partial', 'Insurance Claimed', 'Waived')),
    billing_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: audit_logs
-- ============================================================
CREATE TABLE audit_logs (
    log_id              SERIAL PRIMARY KEY,
    table_name          VARCHAR(100) NOT NULL,
    operation           VARCHAR(20) NOT NULL,
    record_id           INTEGER,
    changed_by          VARCHAR(150),
    old_data            JSONB,
    new_data            JSONB,
    changed_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_appointments_patient   ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor    ON appointments(doctor_id);
CREATE INDEX idx_appointments_date      ON appointments(appointment_date);
CREATE INDEX idx_appointments_status    ON appointments(status);
CREATE INDEX idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX idx_medical_records_doctor  ON medical_records(doctor_id);
CREATE INDEX idx_prescriptions_record   ON prescriptions(record_id);
CREATE INDEX idx_billing_patient        ON billing(patient_id);
CREATE INDEX idx_billing_appointment    ON billing(appointment_id);
CREATE INDEX idx_billing_status         ON billing(payment_status);
CREATE INDEX idx_users_username         ON users(username);
CREATE INDEX idx_audit_logs_table       ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_changed_at  ON audit_logs(changed_at);
