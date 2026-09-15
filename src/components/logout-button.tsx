"use client";

import { clearAccessToken, clearRefreshToken, getRefreshToken } from "@/lib/auth";

const AUTH_BASE = process.env.NEXT_PUBLIC_AUTH_BASE_URL ?? "https://auth.lyceumalabang.edu.ph";

export default function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => {
        const refreshToken = getRefreshToken();
        clearAccessToken();
        clearRefreshToken();
        if (refreshToken) {
          fetch("/api/v1/auth/logout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken }),
          }).catch(() => {});
        }
        window.location.href = `${AUTH_BASE}/sso/logout?redirect=${encodeURIComponent(window.location.origin)}`;
      }}
      className="text-sm text-tertiary hover:text-text transition-colors"
    >
      Logout
    </button>
  );
}
