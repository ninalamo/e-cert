"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Certificates", href: "/dashboard/certificates" },
  { label: "Members", href: "/dashboard/members" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orgId = searchParams.get("org");

  function buildHref(href: string) {
    return orgId ? `${href}?org=${orgId}` : href;
  }

  return (
    <aside className="w-64 border-r bg-gray-50 p-4">
      <div className="mb-6">
        <Link href="/dashboard" className="text-lg font-bold">
          E-Cert
        </Link>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={buildHref(item.href)}
              className={`block rounded-md px-3 py-2 text-sm ${
                isActive
                  ? "bg-black text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
