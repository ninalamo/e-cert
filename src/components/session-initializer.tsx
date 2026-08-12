"use client";

import { useEffect } from "react";
import { hasSSOPayload, consumeSSOPayload } from "@/lib/auth/sso-fragment";
import { getAccessToken, setAccessToken } from "@/lib/auth/token-store";

const REFRESH_PATH = "/api/v1/auth/refresh";

async function silentRestore(): Promise<boolean> {
  if (getAccessToken()) return true;
  try {
    const res = await fetch(REFRESH_PATH, { method: "POST" });
    if (!res.ok) return false;
    const { access_token } = await res.json();
    setAccessToken(access_token);
    return true;
  } catch {
    return false;
  }
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
