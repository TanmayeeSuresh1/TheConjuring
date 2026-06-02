-- ============================================================
-- Advanced SQL Queries - Demonstrating all DBMS concepts
-- ============================================================

-- INNER JOIN: Appointments with patient and doctor names
SELECT a.appointment_id,
       p.first_name || ' ' || p.last_name AS patient_name,
       d.first_name || ' ' || d.last_name AS doctor_name,
       a.appointment_date, a.appointment_time, a.status
FROM appointments a
INNER JOIN patients p ON a.patient_id = p.patient_id
INNER JOIN doctors  d ON a.doctor_id  = d.doctor_id
ORDER BY a.appointment_date DESC;

-- LEFT JOIN: All patients and their appointments (including those with no appointments)
SELECT p.patient_id, p.first_name, p.last_name,
       COUNT(a.appointment_id) AS total_appointments
FROM patients p
LEFT JOIN appointments a ON a.patient_id = p.patient_id
GROUP BY p.patient_id, p.first_name, p.last_name
ORDER BY total_appointments DESC;

-- RIGHT JOIN: All doctors including those with no assigned patients
SELECT d.doctor_id, d.first_name, d.last_name, d.specialization,
       COUNT(a.patient_id) AS total_patients
FROM appointments a
RIGHT JOIN doctors d ON d.doctor_id = a.doctor_id
GROUP BY d.doctor_id, d.first_name, d.last_name, d.specialization;

-- GROUP BY + HAVING: Doctors with more than 2 appointments
SELECT d.doctor_id,
       d.first_name || ' ' || d.last_name AS doctor_name,
       COUNT(a.appointment_id) AS appointment_count
FROM doctors d
JOIN appointments a ON a.doctor_id = d.doctor_id
GROUP BY d.doctor_id, d.first_name, d.last_name
HAVING COUNT(a.appointment_id) > 2
ORDER BY appointment_count DESC;

-- Aggregate Functions
SELECT
    COUNT(*)                           AS total_patients,
    AVG(EXTRACT(YEAR FROM AGE(date_of_birth))) AS avg_age,
    MIN(EXTRACT(YEAR FROM AGE(date_of_birth))) AS min_age,
    MAX(EXTRACT(YEAR FROM AGE(date_of_birth))) AS max_age
FROM patients;

-- Subquery: Patients who have at least one completed appointment
SELECT patient_id, first_name, last_name
FROM patients
WHERE patient_id IN (
    SELECT DISTINCT patient_id FROM appointments WHERE status = 'Completed'
);

-- EXISTS: Patients who have outstanding bills
SELECT p.first_name, p.last_name
FROM patients p
WHERE EXISTS (
    SELECT 1 FROM billing b
    WHERE b.patient_id = p.patient_id
    AND b.payment_status IN ('Pending', 'Partial')
);

-- NOT EXISTS: Patients with no medical records
SELECT p.patient_id, p.first_name, p.last_name
FROM patients p
WHERE NOT EXISTS (
    SELECT 1 FROM medical_records mr WHERE mr.patient_id = p.patient_id
);

-- UNION: All healthcare contacts (patients + doctors)
SELECT first_name, last_name, email, 'Patient' AS contact_type FROM patients
UNION
SELECT first_name, last_name, email, 'Doctor' AS contact_type FROM doctors
ORDER BY contact_type, last_name;

-- INTERSECT: Patients who have both appointments and billing records
SELECT patient_id FROM appointments
INTERSECT
SELECT patient_id FROM billing;

-- EXCEPT: Patients who have appointments but no billing records
SELECT DISTINCT patient_id FROM appointments
EXCEPT
SELECT DISTINCT patient_id FROM billing;

-- Revenue by month
SELECT
    TO_CHAR(billing_date, 'YYYY-MM') AS month,
    COUNT(*) AS total_bills,
    SUM(charges) AS total_charged,
    SUM(amount_paid) AS total_collected,
    SUM(charges - amount_paid) AS outstanding
FROM billing
GROUP BY TO_CHAR(billing_date, 'YYYY-MM')
ORDER BY month DESC;

-- Appointments by status
SELECT status, COUNT(*) AS count,
       ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) AS percentage
FROM appointments
GROUP BY status
ORDER BY count DESC;

-- Doctor performance summary
SELECT
    d.first_name || ' ' || d.last_name AS doctor_name,
    d.specialization,
    COUNT(a.appointment_id) AS total_appointments,
    COUNT(a.appointment_id) FILTER (WHERE a.status = 'Completed') AS completed,
    COUNT(mr.record_id) AS records_created,
    COALESCE(SUM(b.charges), 0) AS revenue_generated
FROM doctors d
LEFT JOIN appointments a ON a.doctor_id = d.doctor_id
LEFT JOIN medical_records mr ON mr.doctor_id = d.doctor_id
LEFT JOIN billing b ON b.appointment_id = a.appointment_id
GROUP BY d.doctor_id, d.first_name, d.last_name, d.specialization
ORDER BY revenue_generated DESC;

-- Transaction example: Schedule appointment safely
BEGIN;
    INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, reason_for_visit)
    VALUES (1, 2, CURRENT_DATE + 7, '14:00', 'Neurological evaluation');
    -- Check for conflicts before committing
    -- COMMIT; or ROLLBACK;
ROLLBACK; -- demonstration only
