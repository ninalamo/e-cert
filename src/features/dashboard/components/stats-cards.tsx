"use client";

import { useState, useEffect } from "react";
import { ORG_ID } from "@/lib/org";
import { getDashboardStatsAction } from "../server/dashboard.actions";

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

  if (!stats) return null;

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
