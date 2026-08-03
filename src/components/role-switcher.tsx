"use client";

import { useTransition } from "react";
import { setImpersonateRole } from "@/features/demo/server/demo.actions";
import type { UserRole } from "@/types/organization";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const roles: { value: UserRole; label: string; color: string }[] = [
  { value: "admin", label: "Admin", color: "bg-red-500" },
  { value: "staff", label: "Staff", color: "bg-blue-500" },
  { value: "participant", label: "Participant", color: "bg-green-500" },
];

export default function RoleSwitcher({ currentRole }: { currentRole: UserRole }) {
  const [isPending, startTransition] = useTransition();

  const current = roles.find((r) => r.value === currentRole) ?? roles[0];

  function switchRole(role: UserRole) {
    startTransition(async () => {
      await setImpersonateRole(role);
      window.location.reload();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-secondary hover:bg-surface-hover transition-colors outline-none">
        <span className={`size-2 rounded-full ${current.color}`} />
        <span className="hidden sm:inline font-medium">{current.label}</span>
        <svg
          className="size-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8}>
        <DropdownMenuLabel className="text-xs text-tertiary">
          {isPending ? "Switching..." : "Impersonate Role"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {roles.map((role) => (
          <DropdownMenuItem
            key={role.value}
            disabled={isPending || currentRole === role.value}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              switchRole(role.value);
            }}
          >
            <span className={`size-2 rounded-full ${role.color}`} />
            {role.label}
            {currentRole === role.value && (
              <span className="ml-auto text-xs text-tertiary">current</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
