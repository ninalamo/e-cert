"use client";

import { logout } from "@/features/auth/server/auth.actions";

export default function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => {
        logout();
      }}
      className="text-sm text-tertiary hover:text-text transition-colors"
    >
      Logout
    </button>
  );
}
