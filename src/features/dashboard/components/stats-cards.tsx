import type { DashboardStats } from "@/lib/api/dashboard";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsCardsProps {
  initialStats: DashboardStats | null;
  isLoading?: boolean;
}

export default function StatsCards({ initialStats, isLoading = false }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-5 gap-4" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="app-card p-4 space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>
    );
  }

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
