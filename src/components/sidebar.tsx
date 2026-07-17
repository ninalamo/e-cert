"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { ORG_ID, ORG_NAME } from "@/lib/org";
import { getDashboardStatsAction } from "@/features/dashboard/server/dashboard.actions";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Templates", href: "/dashboard/templates" },
  { label: "Certificates", href: "/dashboard/certificates" },
  { label: "Members", href: "/dashboard/members" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [certCount, setCertCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const stats = await getDashboardStatsAction(ORG_ID);
      if (!cancelled) setCertCount(stats.totalCertificates);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <aside className="w-64 border-r bg-gray-50 p-4">
      <div className="mb-6">
        <Link href="/dashboard" className="text-lg font-bold">
          E-Cert
        </Link>
        <p className="text-xs text-muted-foreground mt-1">{ORG_NAME}</p>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                isActive
                  ? "bg-black text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span>{item.label}</span>
              {item.href === "/dashboard/certificates" &&
                certCount !== null &&
                certCount > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {certCount}
                  </span>
                )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
