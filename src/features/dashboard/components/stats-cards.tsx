"use client";

import { useState, useEffect } from "react";
import { ORG_ID } from "@/lib/org";
import { getDashboardStatsAction } from "../server/dashboard.actions";
import { SkeletonCards } from "@/components/ui/skeleton";

interface Stats {
  totalCertificates: number;
  activeCertificates: number;
  revokedCertificates: number;
  totalEmails: number;
}

export default function StatsCards() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const data = await getDashboardStatsAction(ORG_ID);
      if (!cancelled) {
        setStats(data);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <SkeletonCards count={4} />;
  }

  if (!stats) return null;

  const cards = [
    { label: "Total Certificates", value: stats.totalCertificates, color: "text-brand-700" },
    { label: "Active", value: stats.activeCertificates, color: "text-green-600" },
    { label: "Revoked", value: stats.revokedCertificates, color: "text-red-600" },
    { label: "Emails Sent", value: stats.totalEmails, color: "text-blue-600" },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="app-card app-card-hover p-4">
          <p className="text-sm text-muted-foreground">{card.label}</p>
          <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
