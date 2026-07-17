"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { getDashboardStatsAction } from "../server/dashboard.actions";

interface Stats {
  totalCertificates: number;
  activeCertificates: number;
  revokedCertificates: number;
  totalEmails: number;
}

function StatsCardsInner() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("org");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    async function load() {
      const data = await getDashboardStatsAction(orgId!);
      if (!cancelled) {
        setStats(data);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [orgId]);

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-md border p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-12" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats || !orgId) {
    return (
      <div className="rounded-md border p-4 text-center text-muted-foreground text-sm">
        Select an organization to view stats.
      </div>
    );
  }

  const cards = [
    { label: "Total Certificates", value: stats.totalCertificates, color: "text-gray-900" },
    { label: "Active", value: stats.activeCertificates, color: "text-green-600" },
    { label: "Revoked", value: stats.revokedCertificates, color: "text-red-600" },
    { label: "Emails Sent", value: stats.totalEmails, color: "text-blue-600" },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">{card.label}</p>
          <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}

export default function StatsCards() {
  return (
    <Suspense fallback={<div className="grid grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-md border p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
          <div className="h-8 bg-gray-200 rounded w-12" />
        </div>
      ))}
    </div>}>
      <StatsCardsInner />
    </Suspense>
  );
}
