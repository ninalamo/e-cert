"use client";

import { setImpersonateUser } from "@/features/demo/server/demo.actions";
import type { ManagedUser } from "@/features/users/server/user.service";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function RoleSwitcher({
  currentUser,
  participants,
}: {
  currentUser: { id: string; name: string | null; email: string | null; role: string } | null;
  participants: ManagedUser[];
}) {
  const current = participants.find((p) => p.id === currentUser?.id) ?? null;

  async function switchUser(userId: string | null) {
    await setImpersonateUser(userId);
    window.location.reload();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-secondary hover:bg-surface-hover transition-colors outline-none">
        <span className="size-2 rounded-full bg-green-500" />
        <span className="hidden sm:inline font-medium">
          {current ? (current.name ?? current.email) : "No impersonation"}
        </span>
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
        {participants.map((user) => (
          <DropdownMenuItem
            key={user.id}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              switchUser(user.id);
            }}
          >
            <span className="flex flex-col">
              <span className="text-sm">{user.name ?? user.email}</span>
              <span className="text-xs text-tertiary">{user.email}</span>
            </span>
            {currentUser?.id === user.id && (
              <span className="ml-auto text-xs text-tertiary">current</span>
            )}
          </DropdownMenuItem>
        ))}
        {currentUser && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                switchUser(null);
              }}
            >
              <span className="text-sm text-tertiary">Clear impersonation</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
