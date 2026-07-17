export interface CertificateEmailLog {
  id: string;
  certificate_id: string;
  sent_to: string;
  subject: string;
  sent_at: string;
  sent_by: string | null;
  status: string;
  error_message: string | null;
}
