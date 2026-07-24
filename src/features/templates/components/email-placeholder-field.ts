export const EMAIL_PLACEHOLDER_FIELDS = [
  { key: "recipient_name", label: "Recipient Name" },
  { key: "certificate_number", label: "Certificate Number" },
  { key: "issued_date", label: "Issued Date" },
  { key: "download_url", label: "Download URL" },
  { key: "verify_url", label: "Verify URL" },
  { key: "org_name", label: "Organization Name" },
] as const;

export type EmailPlaceholderKey = (typeof EMAIL_PLACEHOLDER_FIELDS)[number]["key"];

export const DEFAULT_EMAIL_TEMPLATE = `
<div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #d4d4d8;font-family:Georgia,'Times New Roman',serif;">
  <div style="background-color:#18181b;padding:32px 24px;text-align:center;border-bottom:2px solid #a1a1aa;">
    <p style="color:#d4d4d8;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">{{org_name}}</p>
    <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:600;">Certificate Issued</h1>
  </div>
  <div style="padding:32px 24px;">
    <p style="color:#27272a;font-size:16px;line-height:1.6;margin:0 0 16px;">Dear <strong>{{recipient_name}}</strong>,</p>
    <p style="color:#27272a;font-size:16px;line-height:1.6;margin:0 0 24px;">
      This is to confirm that your certificate has been officially issued. Please review the details below.
    </p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px;border:1px solid #e4e4e7;">
      <tr style="background-color:#fafafa;">
        <td style="padding:12px 16px;color:#71717a;font-size:14px;border-bottom:1px solid #e4e4e7;">Certificate Number</td>
        <td style="padding:12px 16px;font-size:14px;font-weight:600;font-family:'Courier New',monospace;border-bottom:1px solid #e4e4e7;">{{certificate_number}}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;color:#71717a;font-size:14px;">Date of Issue</td>
        <td style="padding:12px 16px;font-size:14px;">{{issued_date}}</td>
      </tr>
    </table>
    <div style="text-align:center;margin:0 0 32px;">
      <a href="{{download_url}}" style="display:inline-block;background-color:#18181b;color:#ffffff;padding:14px 36px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.5px;">
        View Certificate
      </a>
    </div>
    <p style="color:#71717a;font-size:13px;text-align:center;margin:0 0 8px;">
      To verify the authenticity of this certificate, visit:<br/>
      <a href="{{verify_url}}" style="color:#18181b;font-size:13px;">{{verify_url}}</a>
    </p>
  </div>
  <div style="background-color:#fafafa;padding:20px 24px;text-align:center;border-top:1px solid #e4e4e7;">
    <p style="color:#a1a1aa;font-size:12px;margin:0 0 4px;">{{org_name}}</p>
    <p style="color:#a1a1aa;font-size:12px;margin:0;">
      This is an automated message. Please do not reply directly to this email.
    </p>
  </div>
</div>
`;

export function renderEmailTemplate(
  html: string,
  data: {
    recipient_name: string;
    certificate_number: string;
    issued_date: string;
    download_url: string;
    verify_url: string;
    org_name: string;
  }
): string {
  return html
    .replace(/\{\{recipient_name\}\}/g, data.recipient_name)
    .replace(/\{\{certificate_number\}\}/g, data.certificate_number)
    .replace(/\{\{issued_date\}\}/g, data.issued_date)
    .replace(/\{\{download_url\}\}/g, data.download_url)
    .replace(/\{\{verify_url\}\}/g, data.verify_url)
    .replace(/\{\{org_name\}\}/g, data.org_name);
}
