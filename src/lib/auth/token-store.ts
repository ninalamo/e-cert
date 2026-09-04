const ACCESS_KEY = "loa_cert_access_token";
const REFRESH_KEY = "loa_cert_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_KEY, token);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setRefreshToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REFRESH_KEY, token);
}

export function clearRefreshToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REFRESH_KEY);
}

const REFRESH_ENDPOINT = "/api/v1/auth/refresh";

export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  try {
    const init: RequestInit = {
      method: "POST",
      credentials: "include",
    };
    if (refreshToken) {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify({ refresh_token: refreshToken });
    }
    const res = await fetch(REFRESH_ENDPOINT, init);
    if (!res.ok) return false;
    const json = await res.json();
    const data = json.data ?? json;
    const token = data.access_token;
    if (!token) return false;
    setAccessToken(token);
    if (data.refresh_token) {
      setRefreshToken(data.refresh_token);
    }
    return true;
  } catch {
    return false;
  }
}
