"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ORG_NAME } from "@/lib/org";

const navItems = [
  { label: "My Dashboard", href: "/my" },
  { label: "My Certificates", href: "/my/certificates" },
  { label: "Profile", href: "/my/profile" },
];

function isActivePath(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href);
}

export default function ParticipantSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 h-screen w-64 shrink-0 overflow-y-auto border-r border-default bg-surface-muted p-4">
      <div className="mb-6">
        <Link href="/my" className="text-lg font-bold text-brand-700">
          E-Cert
        </Link>
        <p className="text-xs text-tertiary mt-1">{ORG_NAME}</p>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const active = isActivePath(pathname, item.href, item.href === "/my");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-brand-600 text-black font-medium"
                  : "text-secondary hover:bg-surface-hover"
              }`}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
