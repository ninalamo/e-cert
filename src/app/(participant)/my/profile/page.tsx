"use client";

import { parseAccessToken, getAccessToken } from "@/lib/auth";
import { resolveRoleFromPermissions } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLinkIcon } from "lucide-react";

const AUTH_BASE_URL = process.env.NEXT_PUBLIC_AUTH_BASE_URL ?? "";

export default function MyProfilePage() {
  const token = getAccessToken();
  const payload = token ? parseAccessToken(token) : null;
  const name = payload?.name ?? null;
  const email = payload?.email ?? null;
  const role = resolveRoleFromPermissions(payload?.permissions ?? []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-700">Profile</h1>
        <p className="text-sm text-secondary">Your account information.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-brand-700">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase text-tertiary">Name</p>
              <p className="font-medium text-primary">{name ?? "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase text-tertiary">Email</p>
              <p className="text-primary">{email ?? "—"}</p>
              <p className="text-xs text-tertiary">
                Email changes are managed by the administrator.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase text-tertiary">Role</p>
              <p className="capitalize text-primary">{role}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-default pt-4">
            <p className="text-xs text-tertiary">
              Password changes are handled securely on the authentication portal.
            </p>
            <a
              href={`${AUTH_BASE_URL}/forgot-password`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn inline-flex items-center gap-2"
            >
              <ExternalLinkIcon className="size-4" aria-hidden="true" />
              Change password
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
