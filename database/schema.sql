-- Users table: stores all users (admin, subadmin, regular)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100),
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(20) NOT NULL, -- admin, subadmin, user
    status VARCHAR(20) DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sub-admins management: reference to the admin who created them
CREATE TABLE subadmins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Forms table: tracks all filled/active forms per user
CREATE TABLE forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    form_type VARCHAR(50), -- e.g., I-130, I-485
    fields JSONB,
    status VARCHAR(30) DEFAULT 'completed',
    exported_pdf_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity log (optional, for last activity/status)
CREATE TABLE activity_log (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    activity VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- For password reset/verification codes
CREATE TABLE email_verifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    code VARCHAR(10),
    expires_at TIMESTAMP
);

-- Pricing for forms (admin sets price)
CREATE TABLE form_pricing (
    id SERIAL PRIMARY KEY,
    form_type VARCHAR(50) UNIQUE,
    price DECIMAL(10, 2) NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO users (id, full_name, email, password_hash, role, email_verified)
VALUES (
  gen_random_uuid(),
  'Admin User',
  'yes309584@gmail.com',
  '$2b$10$ucciceLQ.B6YGbrOjO4X4.GwoLYFn15ciheGM9AU7DScfpRHu6yjm',
  'admin',
  TRUE
);
SELECT email, password_hash, role FROM users WHERE role='admin';
UPDATE users SET password_hash='$2b$10$uSO3.JA6DBR4ORIaZ4d/6eRMvepFGoAXwCzduPxey9riuJfvXlqxW' WHERE role='admin';

CREATE TABLE IF NOT EXISTS form_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_type VARCHAR(50) UNIQUE NOT NULL,
    price NUMERIC(12,2) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,
    actor_role VARCHAR(20),
    activity_type VARCHAR(50),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- forms_submissions table
CREATE TABLE forms_submissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    form_type VARCHAR(20) NOT NULL,
    form_data JSON NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    payment_id VARCHAR(255),
    amount DECIMAL(10,2),
    pdf_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- payments table
CREATE TABLE payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    form_submission_id INT,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50),
    stripe_payment_id VARCHAR(255),
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (form_submission_id) REFERENCES forms_submissions(id)
);

-- ========================================
-- ADD ADMIN SETTINGS TABLE
-- Stores Stripe keys and other admin configurations
-- Run: psql -U postgres -d postgres -f add_admin_settings.sql
-- ========================================

-- Create admin_settings table
CREATE TABLE IF NOT EXISTS admin_settings (
    id SERIAL PRIMARY KEY,
    stripe_secret_key TEXT,
    stripe_publishable_key TEXT,
    stripe_webhook_secret TEXT,
    company_name VARCHAR(255),
    company_email VARCHAR(255),
    support_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default row (only if table is empty)
INSERT INTO admin_settings (id) 
SELECT 1
WHERE NOT EXISTS (SELECT 1 FROM admin_settings);

-- Verify
SELECT * FROM admin_settings;

-- Success message
SELECT 'Admin settings table created successfully!' AS message;
-- CREATE MISSING TABLES FOR USER BACKEND
-- Run this in PostgreSQL: psql -U postgres -d postgres

-- ========================================
-- 1. FORM SUBMISSIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS form_submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    form_type VARCHAR(10) NOT NULL,
    form_data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_id VARCHAR(255),
    amount DECIMAL(10, 2),
    pdf_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_form_submissions_user_id ON form_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status ON form_submissions(status);
CREATE INDEX IF NOT EXISTS idx_form_submissions_payment_status ON form_submissions(payment_status);

-- ========================================
-- 2. PAYMENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    form_submission_id INTEGER REFERENCES form_submissions(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_submission_id ON payments(form_submission_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent ON payments(stripe_payment_intent_id);

-- ========================================
-- VERIFY TABLES CREATED
-- ========================================
SELECT 
    'form_submissions' as table_name, 
    COUNT(*) as row_count 
FROM form_submissions

UNION ALL

SELECT 
    'payments' as table_name, 
    COUNT(*) as row_count 
FROM payments;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

SELECT * FROM form_submissions;
SELECT * FROM payments;
