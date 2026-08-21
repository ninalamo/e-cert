const STORAGE_KEY = "loa_cert_access_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

const REFRESH_ENDPOINT = "/api/v1/auth/refresh";

export async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch(REFRESH_ENDPOINT, { method: "POST", credentials: "include" });
    if (!res.ok) return false;
    const { access_token, data } = await res.json();
    const token = access_token || data?.access_token;
    if (!token) return false;
    setAccessToken(token);
    return true;
  } catch {
    return false;
  }
}
