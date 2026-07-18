export interface EventAttendee {
  id: string;
  event_id: string;
  organization_id: string;
  name: string;
  email: string;
  attended: boolean;
  completed: boolean;
  attended_at: string | null;
  completed_at: string | null;
  certificate_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}
