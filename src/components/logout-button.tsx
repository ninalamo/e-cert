"use client";

import { clearAccessToken } from "@/lib/auth";

export default function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => {
        clearAccessToken();
        window.location.href = "/";
      }}
      className="text-sm text-tertiary hover:text-text transition-colors"
    >
      Logout
    </button>
  );
}
