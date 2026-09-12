import { setAccessToken } from "./token-store";
import { parseAccessToken } from "./jwt";
import { resolveRoleFromPermissions, getHomePathForRole } from "@/lib/permissions";

const CALLBACK_PATH = "/api/v1/auth/callback";
const REDIRECT_TARGET_KEY = "loa_cert_pending_redirect";

export function hasSSOPayload(): boolean {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  if (params.has("payload")) return true;

  return window.location.hash.startsWith("#payload=");
}

export function getSSOPayload(): string | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const searchPayload = params.get("payload");
  if (searchPayload) return searchPayload;

  const hash = window.location.hash;
  if (hash.startsWith("#payload=")) return hash.slice("#payload=".length);

  return null;
}

export function setPendingRedirectTarget(target: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(REDIRECT_TARGET_KEY, target);
}

export function getPendingRedirectTarget(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(REDIRECT_TARGET_KEY);
}

export function clearPendingRedirectTarget(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(REDIRECT_TARGET_KEY);
}

export async function consumeSSOPayload(): Promise<boolean> {
  const payload = getSSOPayload();
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

  const jwtPayload = parseAccessToken(accessToken);
  const role = jwtPayload ? resolveRoleFromPermissions(jwtPayload.permissions) : "participant";
  const target = getHomePathForRole(role);

  const url = new URL(window.location.href);
  url.searchParams.delete("payload");
  if (url.hash.startsWith("#payload=")) {
    url.hash = "";
  }
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);

  setPendingRedirectTarget(target);
  window.location.href = "/redirect";
  return true;
}
