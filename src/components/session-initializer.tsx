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
    const json = await res.json();
    const token = json.access_token || json.data?.access_token;
    if (!token) return false;
    setAccessToken(token);
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
