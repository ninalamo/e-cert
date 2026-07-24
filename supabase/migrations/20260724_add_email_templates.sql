-- ============================================================
-- Migration: Add Email Template Support
-- Run this safely on existing database - non-destructive
-- ============================================================

-- 1. Add type column to certificate_templates
ALTER TABLE certificate_templates 
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'certificate' 
CHECK (type IN ('certificate', 'email'));

-- 2. Add email_template_id column to events
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS email_template_id UUID REFERENCES certificate_templates(id);

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_cert_templates_type ON certificate_templates(type);
CREATE INDEX IF NOT EXISTS idx_events_email_template ON events(email_template_id);

-- 4. Backfill existing data (safe - idempotent)
UPDATE certificate_templates SET type = 'certificate' WHERE type IS NULL;

-- Done! All existing templates are treated as certificate templates.
-- All existing events use the system default email template.
