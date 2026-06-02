-- ============================================================
-- Healthcare Management System - Sample Data
-- ============================================================

-- PATIENTS
INSERT INTO patients (first_name, last_name, date_of_birth, gender, phone_number, email, address, insurance_details, emergency_contact) VALUES
('James',   'Wilson',   '1985-03-14', 'Male',   '555-0101', 'james.wilson@email.com',   '123 Oak St, Springfield, IL',    'BlueCross Plan A - ID: BC123456',    'Mary Wilson - 555-0102'),
('Sarah',   'Johnson',  '1990-07-22', 'Female', '555-0103', 'sarah.johnson@email.com',  '456 Elm Ave, Chicago, IL',        'Aetna Gold - ID: AE789012',          'Tom Johnson - 555-0104'),
('Michael', 'Brown',    '1978-11-05', 'Male',   '555-0105', 'michael.brown@email.com',  '789 Pine Rd, Peoria, IL',         'United Health - ID: UH345678',       'Linda Brown - 555-0106'),
('Emily',   'Davis',    '1995-02-28', 'Female', '555-0107', 'emily.davis@email.com',    '321 Maple Dr, Rockford, IL',      'Cigna PPO - ID: CI901234',           'Robert Davis - 555-0108'),
('Robert',  'Martinez', '1965-09-17', 'Male',   '555-0109', 'robert.martinez@email.com','654 Cedar Ln, Joliet, IL',        'Medicare Plan B - ID: MC567890',     'Maria Martinez - 555-0110'),
('Jennifer','Taylor',   '1988-06-30', 'Female', '555-0111', 'jennifer.taylor@email.com','987 Birch Blvd, Aurora, IL',      'BCBS Silver - ID: BC234567',         'David Taylor - 555-0112'),
('William', 'Anderson', '1972-12-08', 'Male',   '555-0113', 'william.anderson@email.com','147 Willow Way, Naperville, IL', 'Humana HMO - ID: HU890123',          'Susan Anderson - 555-0114'),
('Lisa',    'Thomas',   '1993-04-15', 'Female', '555-0115', 'lisa.thomas@email.com',    '258 Spruce St, Elgin, IL',        'Aetna Silver - ID: AE456789',        'Mark Thomas - 555-0116');

-- DOCTORS
INSERT INTO doctors (first_name, last_name, specialization, license_number, experience, contact_number, email, availability_status) VALUES
('Dr. Richard', 'Hayes',    'Cardiology',         'LIC-001-CARD', 15, '555-1001', 'r.hayes@hms.com',    'Available'),
('Dr. Amanda',  'Chen',     'Neurology',          'LIC-002-NEUR', 12, '555-1002', 'a.chen@hms.com',     'Available'),
('Dr. James',   'Patel',    'General Medicine',   'LIC-003-GEN',   8, '555-1003', 'j.patel@hms.com',    'Available'),
('Dr. Sandra',  'Williams', 'Pediatrics',         'LIC-004-PED',  20, '555-1004', 's.williams@hms.com', 'Available'),
('Dr. Kevin',   'Ross',     'Orthopedics',        'LIC-005-ORT',  10, '555-1005', 'k.ross@hms.com',     'Busy'),
('Dr. Michelle','Lopez',    'Dermatology',        'LIC-006-DERM',  7, '555-1006', 'm.lopez@hms.com',    'Available'),
('Dr. Thomas',  'Nguyen',   'Oncology',           'LIC-007-ONC',  18, '555-1007', 't.nguyen@hms.com',   'Available'),
('Dr. Patricia','Kim',      'Psychiatry',         'LIC-008-PSY',  14, '555-1008', 'p.kim@hms.com',      'On Leave');

-- USERS (passwords are bcrypt hashes of 'Password@123')
INSERT INTO users (username, password_hash, role, linked_patient_id, linked_doctor_id) VALUES
('admin',           '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5z1z5z5z5z', 'admin',   NULL, NULL),
('james.wilson',    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5z1z5z5z5z', 'patient', 1,    NULL),
('sarah.johnson',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5z1z5z5z5z', 'patient', 2,    NULL),
('michael.brown',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5z1z5z5z5z', 'patient', 3,    NULL),
('emily.davis',     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5z1z5z5z5z', 'patient', 4,    NULL),
('dr.hayes',        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5z1z5z5z5z', 'doctor',  NULL, 1),
('dr.chen',         '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5z1z5z5z5z', 'doctor',  NULL, 2),
('dr.patel',        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5z1z5z5z5z', 'doctor',  NULL, 3),
('dr.williams',     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5z1z5z5z5z', 'doctor',  NULL, 4);

-- APPOINTMENTS
INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, reason_for_visit, notes) VALUES
(1, 1, CURRENT_DATE + 3,  '09:00', 'Scheduled',  'Annual heart checkup',        'Bring previous ECG reports'),
(2, 2, CURRENT_DATE + 1,  '10:30', 'Scheduled',  'Migraine follow-up',          NULL),
(3, 3, CURRENT_DATE - 5,  '11:00', 'Completed',  'Fever and cold symptoms',     'Prescribed antibiotics'),
(4, 6, CURRENT_DATE - 10, '14:00', 'Completed',  'Skin rash evaluation',        'Allergic reaction confirmed'),
(5, 1, CURRENT_DATE - 15, '09:30', 'Completed',  'Chest pain investigation',    'ECG and blood work done'),
(6, 4, CURRENT_DATE + 5,  '11:30', 'Scheduled',  'Child vaccination follow-up', NULL),
(7, 5, CURRENT_DATE - 3,  '15:00', 'Completed',  'Knee pain and swelling',      'X-ray ordered'),
(8, 3, CURRENT_DATE + 2,  '10:00', 'Scheduled',  'Routine checkup',             NULL),
(1, 3, CURRENT_DATE - 20, '13:00', 'Completed',  'General health screening',    'All vitals normal'),
(2, 8, CURRENT_DATE - 7,  '16:00', 'Cancelled',  'Anxiety counseling',          'Patient cancelled');

-- MEDICAL RECORDS
INSERT INTO medical_records (patient_id, doctor_id, diagnosis, allergies, treatment_history, medical_notes, record_date) VALUES
(3, 3, 'Upper Respiratory Infection', 'Penicillin', 'Rest, hydration, antibiotics course', 'Patient responded well to treatment. Follow-up in 2 weeks.', CURRENT_DATE - 5),
(4, 6, 'Contact Dermatitis', 'None known', 'Topical corticosteroid cream applied', 'Avoid contact with identified allergen (nickel).', CURRENT_DATE - 10),
(5, 1, 'Hypertensive Heart Disease', 'Aspirin (mild sensitivity)', 'ACE inhibitors, lifestyle modification', 'Blood pressure 160/95 on admission. Controlled with medication.', CURRENT_DATE - 15),
(7, 5, 'Osteoarthritis - Right Knee', 'NSAIDs (mild GI upset)', 'Physical therapy, pain management', 'Grade 2 osteoarthritis confirmed by X-ray. PT recommended 3x/week.', CURRENT_DATE - 3),
(1, 3, 'Healthy - Routine Screening', 'None', 'No treatment required', 'All vitals within normal range. BMI 23.5. Continue healthy lifestyle.', CURRENT_DATE - 20),
(2, 2, 'Chronic Migraine', 'None', 'Sumatriptan as needed, preventive beta-blockers', 'Frequency reduced from 8 to 3 episodes/month on current regimen.', CURRENT_DATE - 7);

-- PRESCRIPTIONS
INSERT INTO prescriptions (record_id, medication_name, dosage, frequency, duration, instructions) VALUES
(1, 'Azithromycin',       '500mg',  'Once daily',       '5 days',    'Take with food. Complete full course.'),
(1, 'Cetirizine',         '10mg',   'Once daily',       '7 days',    'Take at bedtime. May cause drowsiness.'),
(2, 'Hydrocortisone Cream','1%',    'Twice daily',      '14 days',   'Apply thin layer to affected area only.'),
(3, 'Lisinopril',         '10mg',   'Once daily',       'Ongoing',   'Take in the morning. Monitor BP weekly.'),
(3, 'Amlodipine',         '5mg',    'Once daily',       'Ongoing',   'Do not stop abruptly. Report leg swelling.'),
(4, 'Ibuprofen',          '400mg',  'Three times daily','30 days',   'Take with food. Avoid on empty stomach.'),
(4, 'Glucosamine',        '1500mg', 'Once daily',       '90 days',   'May take 4-6 weeks for full effect.'),
(6, 'Sumatriptan',        '50mg',   'As needed',        'Ongoing',   'Take at onset of migraine. Max 2 per 24hrs.'),
(6, 'Propranolol',        '40mg',   'Twice daily',      'Ongoing',   'Do not stop suddenly. Monitor heart rate.');

-- BILLING
INSERT INTO billing (patient_id, appointment_id, service_description, charges, insurance_claim, amount_paid, payment_status, billing_date) VALUES
(3, 3, 'Consultation + Prescription',     150.00, 100.00, 50.00,  'Paid',              CURRENT_DATE - 5),
(4, 4, 'Dermatology Consultation',        200.00, 150.00, 50.00,  'Paid',              CURRENT_DATE - 10),
(5, 5, 'Cardiology Consult + ECG + Labs', 450.00, 300.00, 150.00, 'Paid',              CURRENT_DATE - 15),
(7, 7, 'Orthopedic Consult + X-Ray',      380.00, 250.00, 0.00,   'Insurance Claimed', CURRENT_DATE - 3),
(1, 9, 'Annual Health Screening',         120.00, 120.00, 0.00,   'Insurance Claimed', CURRENT_DATE - 20),
(2, 2, 'Neurology Consultation',          250.00, 0.00,   0.00,   'Pending',           CURRENT_DATE + 1);

-- AUDIT LOGS (sample)
INSERT INTO audit_logs (table_name, operation, record_id, changed_by, old_data, new_data) VALUES
('medical_records', 'UPDATE', 3, 'dr.patel', 
 '{"diagnosis":"Upper Respiratory Infection","medical_notes":"Initial assessment"}',
 '{"diagnosis":"Upper Respiratory Infection","medical_notes":"Patient responded well to treatment. Follow-up in 2 weeks."}');
