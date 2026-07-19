export async function generateCertificateNumber(_organizationId: string): Promise<string> {
  const epoch = Date.now();
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  const raw = `${epoch}${rand}`.replace(/(\d{4})(?=\d)/g, "$1-");
  return raw;
}
