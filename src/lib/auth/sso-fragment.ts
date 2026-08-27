import { setAccessToken } from "./token-store";
import { parseAccessToken } from "./jwt";
import { resolveRoleFromPermissions, getHomePathForRole } from "@/lib/permissions";

const CALLBACK_PATH = "/api/v1/auth/callback";

export function hasSSOPayload(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hash.startsWith("#payload=");
}

export async function consumeSSOPayload(): Promise<boolean> {
  const hash = window.location.hash;
  const payload = hash.slice("#payload=".length);

  if (!payload) return false;

  let res: Response;
  try {
    res = await fetch(CALLBACK_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload }),
    });
  } catch {
    return false;
  }

  if (!res.ok) return false;

  const json = await res.json();
  const accessToken = json.access_token || json.data?.access_token;
  if (!accessToken) return false;

  setAccessToken(accessToken);

  history.replaceState(null, "", window.location.pathname + window.location.search);

  const jwtPayload = parseAccessToken(accessToken);
  const role = jwtPayload ? resolveRoleFromPermissions(jwtPayload.permissions) : "participant";
  window.location.href = getHomePathForRole(role);
  return true;
}
