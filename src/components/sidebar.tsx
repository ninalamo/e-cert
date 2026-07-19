"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { ORG_ID, ORG_NAME } from "@/lib/org";
import { getDashboardStatsAction } from "@/features/dashboard/server/dashboard.actions";
import type { UserRole } from "@/types/organization";

type NavChild = { label: string; href: string };
type NavItem = {
  label: string;
  href: string;
  children?: NavChild[];
  roles?: UserRole[];
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Events", href: "/events", roles: ["admin", "staff"] },
  {
    label: "Certificates",
    href: "/certificates",
    children: [
      { label: "Records", href: "/certificates" },
      { label: "Editor", href: "/templates" },
    ],
    roles: ["admin", "staff"],
  },
  { label: "Users", href: "/users", roles: ["admin"] },
];

function isActivePath(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href);
}

export default function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const [certCount, setCertCount] = useState<number | null>(null);
  const [certOpen, setCertOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const stats = await getDashboardStatsAction(ORG_ID);
      if (!cancelled) setCertCount(stats.totalCertificates);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const homeHref = role === "participant" ? "/my" : "/dashboard";
  const visibleNav = navItems
    .map((item) =>
      item.label === "Dashboard" ? { ...item, href: homeHref } : item
    )
    .filter((item) => !item.roles || item.roles.includes(role));

  return (
    <aside className="w-64 border-r border-default bg-surface-muted p-4">
      <div className="mb-6">
        <Link href="/dashboard" className="text-lg font-bold text-brand-700">
          E-Cert
        </Link>
        <p className="text-xs text-tertiary mt-1">{ORG_NAME}</p>
      </div>
      <nav className="space-y-1">
        {visibleNav.map((item) => {
          if (!("children" in item)) {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-brand-600 text-black font-medium"
                    : "text-secondary hover:bg-surface-hover"
                }`}
              >
                <span>{item.label}</span>
              </Link>
            );
          }

          const children = item.children ?? [];
          const childActive = children.some((c) =>
            isActivePath(pathname, c.href)
          );
          const parentActive =
            isActivePath(pathname, item.href, true) || childActive;

          return (
            <div key={item.href}>
              <button
                type="button"
                onClick={() => setCertOpen((o) => !o)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  parentActive
                    ? "bg-brand-600 text-black font-medium"
                    : "text-secondary hover:bg-surface-hover"
                }`}
              >
                <span>{item.label}</span>
                <div className="flex items-center gap-2">
                  {certCount !== null && certCount > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        parentActive
                          ? "bg-black/15 text-black"
                          : "bg-slate-200 text-tertiary"
                      }`}
                    >
                      {certCount}
                    </span>
                  )}
                  <svg
                    className={`size-4 transition-transform ${
                      certOpen ? "rotate-90" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>
              {certOpen && (
                <div className="mt-1 space-y-1 pl-3">
                  {children.map((child) => {
                    const active = isActivePath(pathname, child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`flex items-center rounded-lg px-3 py-2 text-sm transition-colors ${
                          active
                            ? "bg-surface-hover text-text font-medium"
                            : "text-secondary hover:bg-surface-hover"
                        }`}
                      >
                        <span className="border-l border-default pl-3 -ml-3">
                          {child.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
