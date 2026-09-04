"use client";

import { useEffect } from "react";
import { hasSSOPayload, consumeSSOPayload } from "@/lib/auth/sso-fragment";
import { getAccessToken, refreshAccessToken } from "@/lib/auth/token-store";

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
    })();
  }, []);

  return null;
}
