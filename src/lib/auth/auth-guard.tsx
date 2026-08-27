"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";

import { useRouter } from "next/navigation";
import {
  getAccessToken,
  refreshAccessToken,
} from "./token-store";
import { parseAccessToken } from "./jwt";
import { FullPageLoader } from "@/components/full-page-loader";

const AUTH_LOGIN_URL = `${process.env.NEXT_PUBLIC_AUTH_BASE_URL}/sso/login`;

const emptySubscribe = () => () => {};

/** Refresh 60s before expiry so idle users never hit an invalid token. */
const REFRESH_LEAD_MS = 60_000;
const MIN_REFRESH_DELAY_MS = 5_000;

function msUntilExpiry(token: string): number {
  const payload = parseAccessToken(token);
  if (!payload?.exp) return 0;
  return payload.exp * 1000 - Date.now();
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const redirectingRef = useRef(false);

  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const redirectToLogin = () => {
      if (cancelled || redirectingRef.current) return;
      redirectingRef.current = true;
      const redirect = encodeURIComponent(window.location.origin);
      router.replace(`${AUTH_LOGIN_URL}?redirect=${redirect}`);
    };

    const scheduleProactiveRefresh = (token: string) => {
      if (cancelled) return;
      const wait = Math.max(
        msUntilExpiry(token) - REFRESH_LEAD_MS,
        MIN_REFRESH_DELAY_MS
      );
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const ok = await refreshAccessToken();
        if (cancelled) return;
        if (ok) {
          const fresh = getAccessToken();
          if (fresh) scheduleProactiveRefresh(fresh);
        } else {
          redirectToLogin();
        }
      }, wait);
    };

    (async () => {
      const token = getAccessToken();

      // Valid token: arm the proactive refresh clock.
      if (token && parseAccessToken(token)) {
        scheduleProactiveRefresh(token);
        return;
      }

      // Missing/expired access token: one silent refresh attempt before
      // evicting to the sign-in page.
      const ok = await refreshAccessToken();
      if (cancelled || redirectingRef.current) return;
      if (ok) {
        const fresh = getAccessToken();
        if (fresh && parseAccessToken(fresh)) {
          scheduleProactiveRefresh(fresh);
          return;
        }
      }
      redirectToLogin();
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mounted, router]);

  if (!mounted) return <FullPageLoader text="Loading…" />;

  const token = getAccessToken();
  const payload = token ? parseAccessToken(token) : null;

  // Expired but silent refresh is in flight … hold the page.
  if (!payload) return <FullPageLoader text="Restoring session…" />;

  return <>{children}</>;
}
