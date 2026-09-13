"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { hasSSOPayload, consumeSSOPayload } from "@/lib/auth/sso-fragment";
import { getAccessToken, refreshAccessToken } from "@/lib/auth/token-store";
import { markSessionReady } from "@/lib/auth/session-ready";

const PUBLIC_PREFIXES = ["/verify", "/faq"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

async function silentRestore(): Promise<boolean> {
  if (getAccessToken()) return true;
  return refreshAccessToken();
}

export function SessionInitializer() {
  const pathname = usePathname();

  useEffect(() => {
    (async () => {
      if (isPublicRoute(pathname)) {
        markSessionReady();
        return;
      }
      if (hasSSOPayload()) {
        await consumeSSOPayload();
      } else {
        await silentRestore();
      }
      markSessionReady();
    })();
  }, [pathname]);

  return null;
}
