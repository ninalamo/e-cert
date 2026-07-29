export interface AuditLog {
  id: string;
  organization_id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  source: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export type AuditAction =
  | "auth.login"
  | "auth.logout"
  | "auth.registered"
  | "auth.email_confirmed"
  | "auth.password_reset_requested"
  | "auth.password_reset"
  | "auth.password_changed"
  | "auth.email_updated"
  | "certificate.issued"
  | "certificate.revoked"
  | "certificate.deleted"
  | "certificate.viewed"
  | "email.sent"
  | "email.failed"
  | "event.created"
  | "event.deleted"
  | "member.added"
  | "member.removed"
  | "member.role_changed"
  | "sql.error"
  | "workflow.error";

export type AuditSource = "ui" | "api" | "workflow" | "system";
