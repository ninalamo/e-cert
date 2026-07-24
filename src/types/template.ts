export interface CertificateTemplate {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  type: 'certificate' | 'email';
  html_content: string;
  css_content: string | null;
  created_at: string;
  updated_at: string;
}
