export type AuthProcess = 'registration' | 'forgot_password' | 'confirm_email' | 'password_reset' | 'welcome';

export interface CertificateTemplate {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  type: 'certificate' | 'email' | 'auth';
  auth_process: AuthProcess | null;
  html_content: string;
  css_content: string | null;
  is_locked?: boolean;
  locked_reason?: string | null;
  created_at: string;
  updated_at: string;
}
