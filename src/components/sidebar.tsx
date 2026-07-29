"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useDashboardStats } from "@/features/dashboard/components/use-dashboard-stats";
import type { UserRole } from "@/types/organization";

type NavChild = { label: string; href: string; roles?: UserRole[] };
type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: NavChild[];
  roles?: UserRole[];
};

function DashboardIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
  );
}
function EventsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/></svg>
  );
}
function CertIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
  );
}
function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  );
}
function TemplatesIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
  );
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <DashboardIcon /> },
  { label: "Events", href: "/events", icon: <EventsIcon />, roles: ["admin", "staff"] },
  { label: "Certificates", href: "/certificates", icon: <CertIcon />, roles: ["admin", "staff"] },
  {
    label: "Templates",
    href: "/templates",
    icon: <TemplatesIcon />,
    children: [
      { label: "Certificates", href: "/templates/certificates" },
      { label: "Emails", href: "/templates/emails" },
    ],
    roles: ["admin", "staff"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: <SettingsIcon />,
    children: [
      { label: "Users", href: "/users" },
      { label: "Audit Log", href: "/audit", roles: ["admin"] },
      { label: "Auth Emails (WIP)", href: "/templates/auth-emails", roles: ["admin"] },
    ],
    roles: ["admin"],
  },
];

function isActivePath(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href);
}

export default function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const [certOpen, setCertOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const { stats } = useDashboardStats();
  const certCount = stats?.totalCertificates ?? null;

  const homeHref = role === "participant" ? "/my" : "/dashboard";
  const visibleNav = navItems
    .map((item) =>
      item.label === "Dashboard" ? { ...item, href: homeHref } : item
    )
    .filter((item) => !item.roles || item.roles.includes(role));

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 overflow-y-auto border-r border-default bg-surface-muted transition-all duration-200 lg:block ${
        collapsed ? "w-16 py-4 px-2" : "w-64 p-4"
      }`}
    >
      <div className={`mb-6 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
        <Link href="/dashboard" className={`font-bold text-brand-700 ${collapsed ? "text-sm" : "text-lg"}`}>
          {collapsed ? "" : "LOA VERICERT"}
        </Link>
        {/* {!collapsed && <p className="text-xs text-tertiary mt-1">{ORG_NAME}</p>} */}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className={`rounded-md p-1 text-tertiary transition-colors hover:bg-surface-hover hover:text-secondary ${collapsed ? "mt-2" : ""}`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {collapsed ? (
              <><path d="m9 18 6-6-6-6"/></>
            ) : (
              <><path d="m15 18-6-6 6-6"/></>
            )}
          </svg>
        </button>
      </div>
      <nav className="space-y-1">
        {visibleNav.map((item) => {
          if (!("children" in item)) {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-lg transition-colors ${
                  collapsed ? "justify-center px-2 py-2.5" : "justify-between px-3 py-2"
                } text-sm ${
                  active
                    ? "bg-brand-600 text-black font-medium"
                    : "text-secondary hover:bg-surface-hover"
                }`}
              >
                <span className="flex items-center gap-3">
                  {item.icon}
                  {!collapsed && <span>{item.label}</span>}
                </span>
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
                onClick={() => {
                  if (collapsed) setCollapsed(false);
                  if (item.label === "Settings") {
                    setSettingsOpen((o) => !o);
                  } else {
                    setCertOpen((o) => !o);
                  }
                }}
                title={collapsed ? item.label : undefined}
                className={`flex w-full items-center gap-3 rounded-lg transition-colors ${
                  collapsed ? "justify-center px-2 py-2.5" : "justify-between px-3 py-2"
                } text-sm ${
                  parentActive
                    ? "bg-brand-600 text-black font-medium"
                    : "text-secondary hover:bg-surface-hover"
                }`}
              >
                <span className="flex items-center gap-3">
                  {item.icon}
                  {!collapsed && <span>{item.label}</span>}
                </span>
                {!collapsed && (
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
                )}
              </button>
              {!collapsed && (item.label === "Settings" ? settingsOpen : certOpen) && (
                <div className="mt-1 space-y-1 pl-3">
                  {children
                    .filter((child) => !child.roles || child.roles.includes(role))
                    .map((child) => {
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
