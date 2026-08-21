"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";
import { getCurrentSession, getHomePathForRole } from "@/lib/permissions";
import { hasSSOPayload } from "@/lib/auth/sso-fragment";

const AUTH_LOGIN_URL = `${process.env.NEXT_PUBLIC_AUTH_BASE_URL}/sso/login`;

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (hasSSOPayload()) return;
    const session = getCurrentSession();
    if (session) {
      router.replace(getHomePathForRole(session.role));
    } else {
      const redirect = encodeURIComponent(window.location.origin);
      router.replace(`${AUTH_LOGIN_URL}?redirect=${redirect}`);
    }
  }, [router]);

  return null;
}
