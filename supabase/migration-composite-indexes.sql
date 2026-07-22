-- Migration: Add composite indexes for common query patterns
-- Covers: ORDER BY created_at DESC on events and certificate_templates listings
-- Run this against your Supabase database (SQL Editor or CLI)

CREATE INDEX IF NOT EXISTS idx_events_org_created ON events(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cert_templates_org_created ON certificate_templates(organization_id, created_at DESC);
