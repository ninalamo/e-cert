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

function isActivePath(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href);
}

function NavLinks({
  items,
  pathname,
  certCount,
  certOpen,
  onToggle,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  certCount: number | null;
  certOpen: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-1">
      {items.map((item) => {
        if (!("children" in item)) {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
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
        const childActive = children.some((c) => isActivePath(pathname, c.href));
        const parentActive =
          isActivePath(pathname, item.href, true) || childActive;

        return (
          <div key={item.href}>
            <button
              type="button"
              onClick={onToggle}
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
                        : "bg-surface-secondary text-tertiary"
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
                      onClick={onNavigate}
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
  );
}

export default function MobileNav({
  role,
}: {
  role?: UserRole;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [certCount, setCertCount] = useState<number | null>(null);
  const [certOpen, setCertOpen] = useState(true);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (role !== "participant") {
      let cancelled = false;
      async function load() {
        const stats = await getDashboardStatsAction(ORG_ID);
        if (!cancelled) setCertCount(stats.totalCertificates);
      }
      load();
      return () => {
        cancelled = true;
      };
    }
  }, [role]);

  const adminItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Events", href: "/events", roles: ["admin", "staff"] },
    {
      label: "Certificates",
      href: "/certificates",
      children: [
        { label: "Records", href: "/certificates" },
        { label: "Template", href: "/templates" },
      ],
      roles: ["admin", "staff"],
    },
    { label: "Users", href: "/users", roles: ["admin"] },
  ];

  const participantItems: NavItem[] = [
    { label: "My Dashboard", href: "/my" },
    { label: "My Certificates", href: "/my/certificates" },
    { label: "Profile", href: "/my/profile" },
  ];

  const items =
    role === "participant"
      ? participantItems
      : adminItems.filter(
          (i) => !i.roles || i.roles.includes((role as UserRole) ?? "admin")
        );

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="btn-icon lg:hidden"
      >
        <svg
          className="size-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
          />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[80%] flex-col bg-surface-muted p-safe pb-6 shadow-ios-xl">
            <div className="flex items-center justify-between border-b border-default px-4 py-3">
              <div>
                <Link
                  href={role === "participant" ? "/my" : "/dashboard"}
                  className="text-lg font-bold text-brand-700"
                >
                  E-Cert
                </Link>
                <p className="text-xs text-tertiary mt-0.5">{ORG_NAME}</p>
              </div>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="btn-icon"
              >
                <svg
                  className="size-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <NavLinks
                items={items}
                pathname={pathname}
                certCount={certCount}
                certOpen={certOpen}
                onToggle={() => setCertOpen((o) => !o)}
                onNavigate={() => setOpen(false)}
              />
              <div className="mt-4 border-t border-default pt-4">
                <Link
                  href="/faq"
                  onClick={() => setOpen(false)}
                  className={`flex items-center rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActivePath(pathname, "/faq")
                      ? "bg-brand-600 text-black font-medium"
                      : "text-secondary hover:bg-surface-hover"
                  }`}
                >
                  <span>FAQ</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
