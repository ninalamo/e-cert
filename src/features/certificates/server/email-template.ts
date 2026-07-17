export function certificateEmailHtml(data: {
  recipientName: string;
  certificateNumber: string;
  issuedDate: string;
  downloadUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background-color:#000000;padding:32px 24px;text-align:center;">
      <h1 style="color:#ffffff;font-size:24px;margin:0;">Certificate Issued</h1>
    </div>
    <div style="padding:32px 24px;">
      <p style="color:#3f3f46;font-size:16px;margin:0 0 16px;">Dear <strong>${data.recipientName}</strong>,</p>
      <p style="color:#3f3f46;font-size:16px;margin:0 0 16px;">
        Your certificate has been successfully issued. Please find the details below:
      </p>
      <div style="background-color:#f4f4f5;border-radius:6px;padding:16px;margin:0 0 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:4px 8px;color:#71717a;font-size:14px;">Certificate Number</td>
            <td style="padding:4px 8px;font-size:14px;font-weight:600;font-family:monospace;">${data.certificateNumber}</td>
          </tr>
          <tr>
            <td style="padding:4px 8px;color:#71717a;font-size:14px;">Issued Date</td>
            <td style="padding:4px 8px;font-size:14px;">${data.issuedDate}</td>
          </tr>
        </table>
      </div>
      <p style="color:#3f3f46;font-size:16px;margin:0 0 24px;">
        You can download your certificate using the link below:
      </p>
      <div style="text-align:center;margin:0 0 24px;">
        <a href="${data.downloadUrl}" style="display:inline-block;background-color:#000000;color:#ffffff;padding:12px 32px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">
          Download Certificate (PDF)
        </a>
      </div>
      <p style="color:#a1a1aa;font-size:13px;margin:0 0 8px;">
        If you have any questions, please contact your administrator.
      </p>
    </div>
    <div style="background-color:#f4f4f5;padding:16px 24px;text-align:center;">
      <p style="color:#a1a1aa;font-size:12px;margin:0;">
        This is an automated message. Please do not reply directly to this email.
      </p>
    </div>
  </div>
</body>
</html>`;
}
