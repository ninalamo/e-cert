export interface Certificate {
  id: string;
  organization_id: string;
  event_id: string | null;
  template_id: string | null;
  recipient_name: string;
  recipient_email: string;
  certificate_number: string;
  issued_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  revoke_reason: string | null;
  file_path: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}
