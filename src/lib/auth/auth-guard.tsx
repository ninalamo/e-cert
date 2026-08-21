"use client";
import { useEffect } from "react";
import { hasSSOPayload } from "./sso-fragment";
import { useRouter } from "next/navigation";
import { getAccessToken } from "./token-store";
import { parseAccessToken } from "./jwt";

const AUTH_LOGIN_URL = `${process.env.NEXT_PUBLIC_AUTH_BASE_URL}/sso/login`;

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const token = getAccessToken();
    if (!token || !parseAccessToken(token)) {
      const redirect = encodeURIComponent(window.location.origin);
      router.replace(`${AUTH_LOGIN_URL}?redirect=${redirect}`);
    }
  }, [router]);

  const token = getAccessToken();
  if (!token || !parseAccessToken(token)) return null;

  return <>{children}</>;
}
