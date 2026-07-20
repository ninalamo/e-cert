"use client";

import { SkeletonCards } from "@/components/ui/skeleton";
import { useDashboardStats } from "./use-dashboard-stats";

export default function StatsCards() {
  const { stats, loading } = useDashboardStats();

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
