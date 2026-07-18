"use client";

import { logout } from "@/features/auth/server/auth.actions";
import { useTransition } from "react";

export default function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          logout();
        });
      }}
      className="text-sm text-tertiary hover:text-text transition-colors"
    >
      {isPending ? "Logging out..." : "Logout"}
    </button>
  );
}
