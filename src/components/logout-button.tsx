"use client";

import { clearAccessToken } from "@/lib/auth";

const AUTH_BASE = process.env.NEXT_PUBLIC_AUTH_BASE_URL ?? "https://auth.lyceumalabang.edu.ph";

export default function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => {
        clearAccessToken();
        window.location.href = `${AUTH_BASE}/sso/logout?redirect=${encodeURIComponent(window.location.origin)}`;
      }}
      className="text-sm text-tertiary hover:text-text transition-colors"
    >
      Logout
    </button>
  );
}
