-- ================================================================
-- CarePlus MASTER Database
-- Database: careplus_master
-- Purpose: Super Admin only - hospital registry, subscriptions,
--          payments, external DB connections
-- ================================================================

CREATE DATABASE IF NOT EXISTS careplus_master
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE careplus_master;

-- ── Super Admin Users ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS super_admin_users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  email       VARCHAR(200) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  is_active   BOOLEAN DEFAULT TRUE,
  last_login  DATETIME,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Hospitals (tenant registry) ────────────────────────────────
CREATE TABLE IF NOT EXISTS hospitals (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(300) NOT NULL,
  code              VARCHAR(20)  UNIQUE NOT NULL,
  email             VARCHAR(200) UNIQUE NOT NULL,
  phone             VARCHAR(20),
  address           TEXT,
  city              VARCHAR(100),
  state             VARCHAR(100),
  country           VARCHAR(100) DEFAULT 'India',
  logo_url          TEXT,
  -- SaaS Plan
  plan              ENUM('basic','standard','premium','enterprise') DEFAULT 'basic',
  status            ENUM('active','suspended','trial','expired') DEFAULT 'trial',
  plan_expires_at   DATETIME,
  max_users         INT DEFAULT 10,
  max_patients      INT DEFAULT 500,
  -- Hybrid DB architecture
  database_type     ENUM('shared','external') DEFAULT 'shared',
  settings          JSON,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_status (status)
);

-- ── External DB Connections (BYOD hospitals) ───────────────────
CREATE TABLE IF NOT EXISTS db_connections (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  hospital_id         INT NOT NULL UNIQUE,
  host                VARCHAR(255) NOT NULL,
  port                INT DEFAULT 3306,
  database_name       VARCHAR(255) NOT NULL,
  username            VARCHAR(255) NOT NULL,
  password_encrypted  TEXT NOT NULL,
  ssl_enabled         BOOLEAN DEFAULT FALSE,
  is_active           BOOLEAN DEFAULT TRUE,
  last_tested_at      DATETIME,
  test_status         ENUM('untested','success','failed') DEFAULT 'untested',
  notes               TEXT,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

-- ── Subscriptions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  hospital_id    INT NOT NULL,
  plan           ENUM('basic','standard','premium','enterprise') DEFAULT 'basic',
  status         ENUM('active','cancelled','expired','trial') DEFAULT 'trial',
  amount         DECIMAL(10,2) DEFAULT 0,
  billing_cycle  ENUM('monthly','quarterly','yearly') DEFAULT 'monthly',
  starts_at      DATETIME,
  expires_at     DATETIME,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hospital (hospital_id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

-- ── Payments ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  hospital_id     INT NOT NULL,
  subscription_id INT,
  amount          DECIMAL(10,2) NOT NULL,
  currency        VARCHAR(10) DEFAULT 'INR',
  status          ENUM('pending','success','failed','refunded') DEFAULT 'pending',
  payment_method  VARCHAR(50),
  transaction_id  VARCHAR(200),
  notes           TEXT,
  paid_at         DATETIME,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hospital (hospital_id),
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

-- ── Audit Logs (global super admin actions) ────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  admin_id    INT,
  hospital_id INT,
  action      ENUM('CREATE','UPDATE','DELETE','LOGIN','SUSPEND','ACTIVATE','TEST_DB') NOT NULL,
  module      VARCHAR(100),
  description TEXT,
  old_data    JSON,
  new_data    JSON,
  ip_address  VARCHAR(50),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

SELECT 'careplus_master schema created successfully!' AS status;
