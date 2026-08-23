"use client";
import { useEffect, useSyncExternalStore } from "react";

import { useRouter } from "next/navigation";
import { getAccessToken } from "./token-store";
import { parseAccessToken } from "./jwt";
import { FullPageLoader } from "@/components/full-page-loader";

const AUTH_LOGIN_URL = `${process.env.NEXT_PUBLIC_AUTH_BASE_URL}/sso/login`;

const emptySubscribe = () => () => {};

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!mounted) return;
    const token = getAccessToken();
    if (!token || !parseAccessToken(token)) {
      const redirect = encodeURIComponent(window.location.origin);
      router.replace(`${AUTH_LOGIN_URL}?redirect=${redirect}`);
    }
  }, [mounted, router]);

  if (!mounted) return <FullPageLoader />;

  const token = getAccessToken();
  const payload = token ? parseAccessToken(token) : null;
  if (!payload) return <FullPageLoader />;

  return <>{children}</>;
}
