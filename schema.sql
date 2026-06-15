-- ================================================================
-- CarePlus SaaS - Master MySQL Schema
-- Database: careplus_saas
-- Version: 2.0.0 (AWS RDS MySQL 8.0)
-- ================================================================

CREATE DATABASE IF NOT EXISTS careplus_saas
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE careplus_saas;

-- ── HOSPITALS (tenants) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospitals (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(300) NOT NULL,
  slug              VARCHAR(100) UNIQUE,
  license_number    VARCHAR(100),
  address           TEXT,
  city              VARCHAR(100),
  state             VARCHAR(100),
  pincode           VARCHAR(20),
  phone             VARCHAR(20),
  email             VARCHAR(200),
  website           VARCHAR(300),
  type              ENUM('Private','Government','Trust','Clinic') DEFAULT 'Private',
  bed_count         INT DEFAULT 0,
  logo_url          TEXT,
  subscription_plan ENUM('Trial','Basic','Professional','Enterprise') DEFAULT 'Trial',
  subscription_status ENUM('Active','Suspended','Expired','Cancelled') DEFAULT 'Active',
  trial_ends_at     DATETIME,
  plan_expires_at   DATETIME,
  monthly_fee       DECIMAL(10,2) DEFAULT 0,
  max_doctors       INT DEFAULT 10,
  max_patients      INT DEFAULT 1000,
  max_staff         INT DEFAULT 50,
  settings          JSON,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── USERS (staff: doctors, nurses, pharmacists, etc.) ──────────
CREATE TABLE IF NOT EXISTS users (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  hospital_id           INT NOT NULL,
  name                  VARCHAR(200) NOT NULL,
  email                 VARCHAR(200) UNIQUE NOT NULL,
  password              VARCHAR(255) NOT NULL,
  role                  ENUM('SUPER_ADMIN','HOSPITAL_ADMIN','DOCTOR','NURSE','RECEPTIONIST','PHARMACIST','LAB_TECHNICIAN','PATIENT') NOT NULL,
  department            VARCHAR(50),
  status                ENUM('Active','Inactive') DEFAULT 'Active',
  phone                 VARCHAR(20),
  profile_image         TEXT,
  employee_id           VARCHAR(50),
  specialization        VARCHAR(200),
  experience            INT DEFAULT 0,
  qualification         VARCHAR(200),
  shift                 ENUM('Morning','Evening','Night','Rotating') DEFAULT 'Morning',
  schedule_days         JSON,
  schedule_start        VARCHAR(20),
  schedule_end          VARCHAR(20),
  availability_status   ENUM('Available','Busy','On Leave','Off Duty') DEFAULT 'Available',
  last_login            DATETIME,
  created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hospital_role (hospital_id, role),
  INDEX idx_email (email),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

-- ── DEPARTMENTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  hospital_id INT NOT NULL,
  name        VARCHAR(200) NOT NULL,
  code        VARCHAR(50),
  description TEXT,
  head_doctor_id INT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hospital (hospital_id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

-- ── PATIENTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  hospital_id       INT NOT NULL,
  patient_id        VARCHAR(50) UNIQUE NOT NULL,
  full_name         VARCHAR(200) NOT NULL,
  email             VARCHAR(200),
  password          VARCHAR(255),
  phone             VARCHAR(20),
  dob               DATE,
  gender            ENUM('Male','Female','Other'),
  blood_group       VARCHAR(10),
  address           TEXT,
  medical_notes     TEXT,
  medical_history   JSON,
  emergency_contact JSON,
  allergies         JSON,
  status            VARCHAR(50) DEFAULT 'Active',
  profile_image     TEXT,
  is_portal_user    BOOLEAN DEFAULT FALSE,
  last_login        DATETIME,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hospital (hospital_id),
  INDEX idx_patient_id (patient_id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

-- ── APPOINTMENTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  hospital_id   INT NOT NULL,
  patient_id    INT NOT NULL,
  doctor_id     INT NOT NULL,
  department    VARCHAR(50) DEFAULT 'OPD',
  date_time     DATETIME NOT NULL,
  token_number  INT DEFAULT 1,
  status        ENUM('Pending','Confirmed','In-Progress','Completed','Cancelled','No-Show') DEFAULT 'Confirmed',
  reason        TEXT,
  notes         TEXT,
  visit_type    VARCHAR(50) DEFAULT 'New',
  booked_by     VARCHAR(50) DEFAULT 'RECEPTIONIST',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hospital_date (hospital_id, date_time),
  INDEX idx_doctor (doctor_id),
  INDEX idx_patient (patient_id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES users(id)
);

-- ── TOKENS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tokens (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  hospital_id    INT NOT NULL,
  appointment_id INT NOT NULL,
  patient_id     INT NOT NULL,
  doctor_id      INT NOT NULL,
  token_number   INT NOT NULL,
  token_date     DATE NOT NULL,
  status         ENUM('Waiting','In-Progress','Completed','Cancelled','Skipped') DEFAULT 'Waiting',
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hospital_date (hospital_id, token_date),
  INDEX idx_appointment (appointment_id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

-- ── VITALS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vitals (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  hospital_id      INT NOT NULL,
  patient_id       INT NOT NULL,
  appointment_id   INT,
  recorded_by      INT,
  blood_pressure   VARCHAR(20),
  pulse            INT,
  temperature      DECIMAL(5,2),
  spo2             INT,
  weight           DECIMAL(5,2),
  height           DECIMAL(5,2),
  bmi              DECIMAL(5,2),
  respiratory_rate INT,
  blood_sugar      DECIMAL(6,2),
  notes            TEXT,
  recorded_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hospital_patient (hospital_id, patient_id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- ── CONSULTATIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consultations (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  hospital_id     INT NOT NULL,
  appointment_id  INT NOT NULL,
  patient_id      INT NOT NULL,
  doctor_id       INT NOT NULL,
  symptoms        TEXT,
  diagnosis       TEXT,
  notes           TEXT,
  follow_up_date  DATETIME,
  follow_up_notes TEXT,
  status          ENUM('Pending','In-Progress','Completed') DEFAULT 'Pending',
  lab_tests       JSON,
  started_at      DATETIME,
  completed_at    DATETIME,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hospital (hospital_id),
  INDEX idx_appointment (appointment_id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES users(id)
);

-- ── PRESCRIPTIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  hospital_id     INT NOT NULL,
  consultation_id INT,
  appointment_id  INT,
  patient_id      INT NOT NULL,
  doctor_id       INT NOT NULL,
  diagnosis       TEXT,
  instructions    TEXT,
  status          ENUM('Active','Completed','Cancelled') DEFAULT 'Active',
  valid_until     DATE,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hospital_patient (hospital_id, patient_id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES users(id)
);

-- ── PRESCRIPTION MEDICINES (line items) ────────────────────────
CREATE TABLE IF NOT EXISTS prescription_medicines (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  prescription_id INT NOT NULL,
  name            VARCHAR(200) NOT NULL,
  generic_name    VARCHAR(200),
  dosage          VARCHAR(100),
  frequency       VARCHAR(100),
  duration        VARCHAR(100),
  route           VARCHAR(50),
  instructions    TEXT,
  quantity        INT DEFAULT 1,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
);

-- ── PHARMACY ORDERS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pharmacy_orders (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  hospital_id    INT NOT NULL,
  prescription_id INT,
  patient_id     INT NOT NULL,
  pharmacist_id  INT,
  status         ENUM('Pending','Processing','Ready','Delivered','Cancelled') DEFAULT 'Pending',
  total_amount   DECIMAL(10,2) DEFAULT 0,
  payment_status ENUM('Unpaid','Paid','Partial') DEFAULT 'Unpaid',
  notes          TEXT,
  processed_at   DATETIME,
  delivered_at   DATETIME,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hospital_patient (hospital_id, patient_id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- ── MEDICINE INVENTORY ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medicine_inventory (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  hospital_id       INT NOT NULL,
  name              VARCHAR(200) NOT NULL,
  generic_name      VARCHAR(200),
  category          VARCHAR(100),
  manufacturer      VARCHAR(200),
  batch_number      VARCHAR(100),
  expiry_date       DATE,
  unit              VARCHAR(50),
  quantity_in_stock INT DEFAULT 0,
  reorder_level     INT DEFAULT 10,
  unit_price        DECIMAL(10,2) DEFAULT 0,
  location          VARCHAR(100),
  status            ENUM('In Stock','Low Stock','Out of Stock','Expired') DEFAULT 'In Stock',
  description       TEXT,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hospital (hospital_id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

-- ── LAB TESTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lab_tests (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  hospital_id     INT NOT NULL,
  consultation_id INT,
  patient_id      INT,
  doctor_id       INT,
  test_name       VARCHAR(200) NOT NULL,
  test_code       VARCHAR(50),
  category        VARCHAR(100),
  status          ENUM('Ordered','Sample-Collected','Processing','Completed','Cancelled') DEFAULT 'Ordered',
  result          TEXT,
  result_url      TEXT,
  s3_key          TEXT,
  normal_range    VARCHAR(200),
  unit            VARCHAR(50),
  priority        ENUM('Routine','Urgent','STAT') DEFAULT 'Routine',
  notes           TEXT,
  completed_at    DATETIME,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hospital_patient (hospital_id, patient_id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

-- ── REPORTS (S3-backed) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  hospital_id     INT NOT NULL,
  patient_id      INT NOT NULL,
  appointment_id  INT,
  uploaded_by     INT,
  title           VARCHAR(300) NOT NULL,
  report_type     ENUM('Lab','Radiology','Pathology','Prescription','Discharge','Other') DEFAULT 'Other',
  file_url        TEXT,
  s3_key          TEXT,
  file_name       VARCHAR(500),
  file_size       INT,
  file_type       VARCHAR(50),
  description     TEXT,
  status          ENUM('Pending','Ready','Reviewed') DEFAULT 'Ready',
  is_deleted      BOOLEAN DEFAULT FALSE,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hospital_patient (hospital_id, patient_id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- ── NOTIFICATIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  hospital_id          INT,
  user_id              INT,
  title                VARCHAR(300) NOT NULL,
  message              TEXT NOT NULL,
  type                 ENUM('patient','appointment','doctor','nurse','pharmacy','laboratory','billing','system') DEFAULT 'system',
  priority             ENUM('low','medium','high','critical') DEFAULT 'medium',
  status               ENUM('unread','read','resolved') DEFAULT 'unread',
  is_important         BOOLEAN DEFAULT FALSE,
  related_entity_id    INT,
  related_entity_type  VARCHAR(100),
  metadata             JSON,
  read_at              DATETIME,
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hospital_user (hospital_id, user_id),
  INDEX idx_status (status)
);

-- ── BILLING / PAYMENTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_payments (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  hospital_id     INT NOT NULL,
  patient_id      INT,
  appointment_id  INT,
  amount          DECIMAL(10,2) NOT NULL,
  currency        VARCHAR(10) DEFAULT 'INR',
  status          ENUM('Pending','Paid','Failed','Refunded') DEFAULT 'Pending',
  payment_method  ENUM('Cash','Card','UPI','Insurance','Online','Other') DEFAULT 'Cash',
  transaction_id  VARCHAR(200),
  description     TEXT,
  bill_type       ENUM('Consultation','Lab','Pharmacy','Room','Other') DEFAULT 'Consultation',
  paid_at         DATETIME,
  invoice_number  VARCHAR(100),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hospital_patient (hospital_id, patient_id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

-- ── AUDIT LOGS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  hospital_id INT,
  user_id     INT,
  action      ENUM('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','VIEW','EXPORT') NOT NULL,
  module      VARCHAR(100),
  table_name  VARCHAR(100),
  record_id   INT,
  old_data    JSON,
  new_data    JSON,
  description TEXT,
  ip_address  VARCHAR(50),
  user_agent  TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_hospital (hospital_id),
  INDEX idx_user (user_id),
  INDEX idx_created (created_at)
);

-- ── SUBSCRIPTIONS (managed by super admin) ─────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  hospital_id     INT NOT NULL UNIQUE,
  plan            ENUM('Trial','Basic','Professional','Enterprise') DEFAULT 'Trial',
  status          ENUM('Active','Suspended','Expired','Cancelled') DEFAULT 'Active',
  monthly_fee     DECIMAL(10,2) DEFAULT 0,
  started_at      DATETIME,
  expires_at      DATETIME,
  trial_ends_at   DATETIME,
  auto_renew      BOOLEAN DEFAULT TRUE,
  notes           TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

-- ── SUBSCRIPTION PAYMENTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_payments (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  hospital_id     INT NOT NULL,
  subscription_id INT NOT NULL,
  amount          DECIMAL(10,2) NOT NULL,
  currency        VARCHAR(10) DEFAULT 'INR',
  status          ENUM('Pending','Paid','Failed','Refunded') DEFAULT 'Pending',
  payment_method  VARCHAR(50),
  transaction_id  VARCHAR(200),
  period_from     DATE,
  period_to       DATE,
  paid_at         DATETIME,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hospital (hospital_id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

-- ── SUPER ADMIN (global) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS super_admins (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  email       VARCHAR(200) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  is_active   BOOLEAN DEFAULT TRUE,
  last_login  DATETIME,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

SELECT 'CarePlus SaaS Schema created successfully!' AS status;
