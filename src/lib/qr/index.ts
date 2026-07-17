import QRCode from "qrcode";

export interface QrOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

export async function generateQrCode(
  data: string,
  options: QrOptions = {}
): Promise<Buffer> {
  const { width = 256, margin = 2, color } = options;

  const buffer = await QRCode.toBuffer(data, {
    type: "png",
    width,
    margin,
    color,
  });

  return buffer;
}

export async function generateQrCodeDataUrl(
  data: string,
  options: QrOptions = {}
): Promise<string> {
  const { width = 256, margin = 2, color } = options;

  return QRCode.toDataURL(data, {
    width,
    margin,
    color,
  });
}
