"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";
import {
  getCurrentSession,
  getHomePathForRole,
} from "@/lib/permissions";
import { hasSSOPayload } from "@/lib/auth/sso-fragment";
import { FullPageLoader } from "@/components/full-page-loader";

const AUTH_LOGIN_URL = `${process.env.NEXT_PUBLIC_AUTH_BASE_URL}/sso/login`;

export default function Home() {
  const router = useRouter();
  type Status = "resolving" | "session" | "anonymous";
  const [status, setStatus] = useState<Status>("resolving");

  useEffect(() => {
    if (hasSSOPayload()) return;
    const session = getCurrentSession();
    if (session) {
      router.replace(getHomePathForRole(session.role));
    } else {
      const redirect = encodeURIComponent(window.location.origin);
      router.replace(`${AUTH_LOGIN_URL}?redirect=${redirect}`);
    }
    // Deferred so the redirect renders before the label settles.
    const timer = setTimeout(
      () => setStatus(session ? "session" : "anonymous"),
      0
    );
    return () => clearTimeout(timer);
  }, [router]);

  const text =
    status === "anonymous"
      ? "Redirecting to sign in…"
      : status === "session"
        ? "Loading…"
        : hasSSOPayload()
          ? "Signing you in…"
          : "Loading…";

  return <FullPageLoader text={text} />;
}
