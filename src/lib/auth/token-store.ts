let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}

const REFRESH_ENDPOINT = "/api/v1/auth/refresh";

export async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch(REFRESH_ENDPOINT, { method: "POST", credentials: "include" });
    if (!res.ok) return false;
    const { access_token } = await res.json();
    if (!access_token) return false;
    setAccessToken(access_token);
    return true;
  } catch {
    return false;
  }
}
