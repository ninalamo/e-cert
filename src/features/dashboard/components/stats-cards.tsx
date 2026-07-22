"use client";

import type { DashboardStats } from "../server/dashboard.service";

interface StatsCardsProps {
  initialStats: DashboardStats;
}

export default function StatsCards({ initialStats }: StatsCardsProps) {
  const cards = [
    { label: "Total Certificates", value: initialStats.totalCertificates, color: "text-brand-700" },
    { label: "Active", value: initialStats.activeCertificates, color: "text-green-600" },
    { label: "Revoked", value: initialStats.revokedCertificates, color: "text-red-600" },
    { label: "Emails Sent", value: initialStats.totalEmails, color: "text-blue-600" },
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
