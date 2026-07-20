export function certificateEmailHtml(data: {
  recipientName: string;
  certificateNumber: string;
  issuedDate: string;
  downloadUrl: string;
  verifyUrl: string;
  orgName: string;
  qrCodeDataUrl?: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border:1px solid #d4d4d8;">
    <div style="background-color:#18181b;padding:32px 24px;text-align:center;border-bottom:2px solid #a1a1aa;">
      <p style="color:#d4d4d8;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">${data.orgName}</p>
      <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:600;">Certificate Issued</h1>
    </div>
    <div style="padding:32px 24px;">
      <p style="color:#27272a;font-size:16px;line-height:1.6;margin:0 0 16px;">Dear <strong>${data.recipientName}</strong>,</p>
      <p style="color:#27272a;font-size:16px;line-height:1.6;margin:0 0 24px;">
        This is to confirm that your certificate has been officially issued. Please review the details below.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;border:1px solid #e4e4e7;">
        <tr style="background-color:#fafafa;">
          <td style="padding:12px 16px;color:#71717a;font-size:14px;border-bottom:1px solid #e4e4e7;">Certificate Number</td>
          <td style="padding:12px 16px;font-size:14px;font-weight:600;font-family:'Courier New',monospace;border-bottom:1px solid #e4e4e7;">${data.certificateNumber}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;color:#71717a;font-size:14px;">Date of Issue</td>
          <td style="padding:12px 16px;font-size:14px;">${data.issuedDate}</td>
        </tr>
      </table>
      <div style="text-align:center;margin:0 0 32px;">
        <a href="${data.downloadUrl}" style="display:inline-block;background-color:#18181b;color:#ffffff;padding:14px 36px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.5px;">
          View Certificate
        </a>
      </div>
      <p style="color:#71717a;font-size:13px;text-align:center;margin:0 0 8px;">
        To verify the authenticity of this certificate, visit:<br/>
        <a href="${data.verifyUrl}" style="color:#18181b;font-size:13px;">${data.verifyUrl}</a>
      </p>
    </div>
    <div style="background-color:#fafafa;padding:20px 24px;text-align:center;border-top:1px solid #e4e4e7;">
      <p style="color:#a1a1aa;font-size:12px;margin:0 0 4px;">${data.orgName}</p>
      <p style="color:#a1a1aa;font-size:12px;margin:0;">
        This is an automated message. Please do not reply directly to this email.
      </p>
    </div>
  </div>
</body>
</html>`;
}
