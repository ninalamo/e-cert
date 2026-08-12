import { setAccessToken } from "./token-store";

const CALLBACK_PATH = "/api/v1/auth/callback";

export function hasSSOPayload(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hash.startsWith("#payload=");
}

export async function consumeSSOPayload(): Promise<boolean> {
  const hash = window.location.hash;
  const payload = hash.slice("#payload=".length);

  history.replaceState(null, "", window.location.pathname + window.location.search);

  if (!payload) return false;

  const res = await fetch(CALLBACK_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  });

  if (!res.ok) return false;

  const { access_token } = await res.json();
  setAccessToken(access_token);
  return true;
}
