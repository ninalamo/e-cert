export interface Event {
  id: string;
  organization_id: string;
  template_id: string | null;
  name: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  organizer: string | null;
  certificate_title: string | null;
  certificate_number_pattern: string;
  valid_until: string | null;
  status: "draft" | "active" | "archive";
  created_at: string;
  updated_at: string;
}
