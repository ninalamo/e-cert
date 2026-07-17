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
  valid_until: string | null;
  status: "draft" | "published" | "completed";
  created_at: string;
  updated_at: string;
}
