"use client";

import { useState, useEffect } from "react";
import type { Organization } from "@/types/organization";
import { getMyOrganizationsAction } from "../server/organization.actions";

interface OrgSwitcherProps {
  currentOrgId: string | null;
  onSelect: (org: Organization) => void;
}

export default function OrgSwitcher({ currentOrgId, onSelect }: OrgSwitcherProps) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getMyOrganizationsAction().then(setOrgs);
  }, []);

  const currentOrg = orgs.find((o) => o.id === currentOrgId);

  if (orgs.length <= 1) {
    return currentOrg ? (
      <div className="px-3 py-2 text-sm font-medium">{currentOrg.name}</div>
    ) : null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm"
      >
        {currentOrg?.name ?? "Select organization"}
        <span className="ml-2 text-xs">▼</span>
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-lg">
          {orgs.map((org) => (
            <button
              key={org.id}
              onClick={() => {
                onSelect(org);
                setOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                org.id === currentOrgId ? "font-medium bg-gray-50" : ""
              }`}
            >
              {org.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
