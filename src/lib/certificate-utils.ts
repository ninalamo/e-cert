interface Expirable {
  expires_at: string | null;
  revoked_at: string | null;
}

export function isCertExpired(cert: Expirable, now: Date = new Date()): boolean {
  return !!cert.expires_at && new Date(cert.expires_at) < now && !cert.revoked_at;
}

export function countExpired(certs: Expirable[], now: Date = new Date()): number {
  let count = 0;
  for (const c of certs) {
    if (isCertExpired(c, now)) count++;
  }
  return count;
}
