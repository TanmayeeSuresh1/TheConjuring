# MediCare HMS — Healthcare Management System

A complete full-stack DBMS project built with **PostgreSQL**, **FastAPI**, and **React + Tailwind CSS**.

---

## Project Structure

```
hms/
├── database/           # All SQL scripts
│   ├── schema.sql          # Tables, indexes, constraints
│   ├── triggers.sql        # 4 trigger functions
│   ├── procedures.sql      # Stored procedures & functions
│   ├── views.sql           # USER_VIEW & ADMIN_VIEW
│   ├── roles_permissions.sql # SQL roles, grants, RLS
│   ├── sample_data.sql     # 8 patients, 8 doctors, sample records
│   └── advanced_queries.sql # All SQL concepts demonstrated
├── backend/            # FastAPI Python backend
│   ├── app/
│   │   ├── api/            # Route handlers (auth, patients, doctors, etc.)
│   │   ├── core/           # Config, database, security
│   │   ├── middleware/      # JWT auth & RBAC middleware
│   │   ├── models/         # SQLAlchemy ORM models
│   │   └── schemas/        # Pydantic request/response schemas
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/           # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── pages/          # Admin, Doctor, Patient dashboards
│   │   ├── components/     # Reusable UI components
│   │   ├── layouts/        # Sidebar layouts per role
│   │   ├── context/        # Auth & Theme context
│   │   └── services/       # Axios API client
│   └── Dockerfile
└── docker-compose.yml
```

---

## Quick Start (Docker)

```bash
cd hms
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/docs
- PostgreSQL: localhost:5432

---

## Quick Start (Local Development)

### 1. Database

```bash
# Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE healthcare_db;"
psql -U postgres -c "CREATE USER hms_user WITH PASSWORD 'hms_password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE healthcare_db TO hms_user;"

# Run SQL scripts in order
psql -U hms_user -d healthcare_db -f database/schema.sql
psql -U hms_user -d healthcare_db -f database/triggers.sql
psql -U hms_user -d healthcare_db -f database/procedures.sql
psql -U hms_user -d healthcare_db -f database/views.sql
psql -U hms_user -d healthcare_db -f database/sample_data.sql
```

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

pip install -r requirements.txt

# Edit .env with your DATABASE_URL and SECRET_KEY
uvicorn main:app --reload --port 8000
```

API Docs available at: http://localhost:8000/api/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at: http://localhost:3000 (proxies /api to backend)

---

## Demo Accounts

| Role    | Username      | Password      |
|---------|--------------|---------------|
| Admin   | admin         | Password@123  |
| Doctor  | dr.hayes      | Password@123  |
| Doctor  | dr.chen       | Password@123  |
| Patient | james.wilson  | Password@123  |
| Patient | sarah.johnson | Password@123  |

> Note: The sample data uses placeholder password hashes. Run `init_passwords.py` or register new users for real bcrypt hashes.

---

## Database Design

### ER Diagram Summary

```
PATIENTS ──< APPOINTMENTS >── DOCTORS
    |              |
    ├──< MEDICAL_RECORDS >── DOCTORS
    |        |
    |    PRESCRIPTIONS
    |
    └──< BILLING >── APPOINTMENTS
         
USERS ──> PATIENTS (linked_patient_id)
USERS ──> DOCTORS  (linked_doctor_id)
AUDIT_LOGS (tracks all changes)
```

### Normalization (3NF)
- No repeating groups (1NF)
- No partial dependencies (2NF)
- No transitive dependencies (3NF)
- All non-key attributes depend solely on their primary key

### Triggers
1. `audit_medical_records` — logs every UPDATE on medical_records
2. `update_appointment_status` — auto-marks past appointments as No-Show
3. `generate_billing_on_completion` — auto-creates billing when appointment is Completed
4. `audit_patients` — logs every UPDATE on patients table

### Stored Procedures/Functions
1. `schedule_appointment()` — validates and books appointments with conflict checking
2. `get_patient_medical_summary()` — returns comprehensive patient health summary
3. `get_revenue_summary()` — calculates revenue metrics for any date range

### Views
- `user_view` — patient-facing read-only view of own data
- `admin_view` — complete joined view for administrative access

### Indexes
- All foreign keys indexed for join performance
- Composite indexes on frequently filtered columns (date, status)

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/login | Login, returns JWT |
| POST | /api/v1/auth/register | Register user |
| POST | /api/v1/auth/refresh | Refresh access token |
| GET  | /api/v1/auth/me | Current user info |
| POST | /api/v1/auth/change-password | Change password |

### Patients (Admin/Doctor read, Admin write)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/patients | List all patients |
| GET | /api/v1/patients/me | Patient's own profile |
| GET | /api/v1/patients/{id} | Get patient by ID |
| POST | /api/v1/patients | Create patient (Admin) |
| PUT | /api/v1/patients/{id} | Update patient (Admin) |
| DELETE | /api/v1/patients/{id} | Delete patient (Admin) |
| GET | /api/v1/patients/{id}/summary | Medical summary |

### Doctors, Appointments, Medical Records, Billing
All follow RESTful CRUD patterns with role-based access enforcement.

### Dashboard
| Endpoint | Role |
|----------|------|
| GET /api/v1/dashboard/stats | Admin |
| GET /api/v1/dashboard/doctor-stats | Doctor |
| GET /api/v1/dashboard/patient-stats | Patient |
| GET /api/v1/dashboard/appointment-trends | Admin |
| GET /api/v1/dashboard/audit-logs | Admin |

---

## Security

- **JWT Bearer tokens** — access (60 min) + refresh (7 days)
- **bcrypt password hashing** — passlib with cost factor 12
- **RBAC middleware** — enforced at every route
- **Row-Level Security** — PostgreSQL RLS for patient data isolation
- **SQL roles** — `hms_admin`, `hms_doctor`, `hms_patient` DB roles
- **Input validation** — Pydantic schemas on all endpoints
- **CORS** — restricted origins

---

## DBMS Concepts Demonstrated

| Concept | Location |
|---------|----------|
| CREATE DATABASE/TABLE | schema.sql |
| ALTER TABLE | schema.sql (constraints) |
| INSERT/UPDATE/DELETE | sample_data.sql, API |
| INNER/LEFT/RIGHT JOIN | advanced_queries.sql |
| GROUP BY / HAVING | advanced_queries.sql |
| Aggregate Functions | advanced_queries.sql |
| Subqueries / EXISTS | advanced_queries.sql |
| UNION / INTERSECT / EXCEPT | advanced_queries.sql |
| Indexes | schema.sql |
| Primary/Foreign/Unique/Check Keys | schema.sql |
| Transactions | advanced_queries.sql |
| Stored Procedures | procedures.sql |
| Triggers | triggers.sql |
| Views | views.sql |
| Roles & Privileges | roles_permissions.sql |
| Row-Level Security | roles_permissions.sql |

---

## Future Enhancements

- Real-time notifications (WebSockets)
- Telemedicine / video consultation module
- Lab results and imaging integration
- Mobile app (React Native)
- Multi-hospital / clinic support
- HL7 FHIR compliance for interoperability
- AI-based diagnosis assistance
- Patient mobile check-in QR codes
