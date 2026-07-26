import { cookies } from "next/headers";
import { authConfig } from "./config";
import { type JwtPayload, signToken, verifyToken } from "./jwt";

export async function setSession(payload: JwtPayload): Promise<void> {
  const token = await signToken(payload);
  const store = await cookies();
  store.set(authConfig.sessionCookie, token, {
    httpOnly: true,
    secure: authConfig.secureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: authConfig.jwtExpiry,
  });
}

export async function getSession(): Promise<JwtPayload | null> {
  const store = await cookies();
  const token = store.get(authConfig.sessionCookie)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(authConfig.sessionCookie);
  store.delete(authConfig.refreshCookie);
}

export async function setRefreshCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(authConfig.refreshCookie, token, {
    httpOnly: true,
    secure: authConfig.secureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: authConfig.refreshExpiry,
  });
}
