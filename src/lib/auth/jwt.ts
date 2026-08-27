export interface JwtPayload {
  sub: string;
  email: string;
  name: string | null;
  groups: string[];
  permissions: string[];
  tenant: { id: string; slug: string };
  exp?: number;
}

export function parseAccessToken(token: string): JwtPayload | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.type !== "access") return null;
    if (payload.exp * 1000 < Date.now()) return null;
    if (payload.tenant?.slug !== process.env.NEXT_PUBLIC_CERT_TENANT_SLUG) return null;
    return payload;
  } catch {
    return null;
  }
}
