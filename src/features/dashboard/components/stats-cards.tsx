import type { DashboardStats } from "@/lib/api/dashboard";

interface StatsCardsProps {
  initialStats: DashboardStats | null;
}

export default function StatsCards({ initialStats }: StatsCardsProps) {
  if (!initialStats) return null;

  const cards = [
    { label: "Total Events", value: initialStats.total_events, color: "text-brand-700" },
    { label: "Active Events", value: initialStats.active_events, color: "text-green-600" },
    { label: "Total Certificates", value: initialStats.total_certificates, color: "text-blue-600" },
    { label: "Issued This Month", value: initialStats.certificates_issued_this_month, color: "text-purple-600" },
    { label: "Total Attendees", value: initialStats.total_attendees, color: "text-orange-600" },
  ];

  return (
    <div className="grid grid-cols-5 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="app-card app-card-hover p-4">
          <p className="text-sm text-muted-foreground">{card.label}</p>
          <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
