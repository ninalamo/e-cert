-- Add auth email template support
-- Adds 'auth' type and auth_process column to certificate_templates

-- Update type CHECK constraint to include 'auth'
ALTER TABLE certificate_templates 
  DROP CONSTRAINT IF EXISTS certificate_templates_type_check;

ALTER TABLE certificate_templates 
  ADD CONSTRAINT certificate_templates_type_check 
  CHECK (type IN ('certificate', 'email', 'auth'));

-- Add auth_process column
ALTER TABLE certificate_templates 
  ADD COLUMN IF NOT EXISTS auth_process TEXT;

-- Unique constraint: one template per auth process (only where auth_process is set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_auth_process 
  ON certificate_templates(auth_process) 
  WHERE auth_process IS NOT NULL;
