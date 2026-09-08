"use client";

import { useEffect } from "react";
import { hasSSOPayload, consumeSSOPayload } from "@/lib/auth/sso-fragment";
import { getAccessToken, refreshAccessToken } from "@/lib/auth/token-store";
import { markSessionReady } from "@/lib/auth/session-ready";

async function silentRestore(): Promise<boolean> {
  if (getAccessToken()) return true;
  return refreshAccessToken();
}

export function SessionInitializer() {
  useEffect(() => {
    (async () => {
      if (hasSSOPayload()) {
        await consumeSSOPayload();
      } else {
        await silentRestore();
      }
      markSessionReady();
    })();
  }, []);

  return null;
}
