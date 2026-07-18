export interface AttendeeMetadata {
  generation_mode?: "template" | "file";
  html?: string;
  file_data?: string;
  file_name?: string;
  file_type?: string;
}

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
  metadata: AttendeeMetadata | null;
  created_at: string;
  updated_at: string;
}
