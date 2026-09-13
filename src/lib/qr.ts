import QRCode from "qrcode";

export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 1, width: 256 });
}

export function buildCertificateVerifyUrl(certificateNumber: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? window.location.origin;
  return `${base}/verify/${certificateNumber}`;
}
