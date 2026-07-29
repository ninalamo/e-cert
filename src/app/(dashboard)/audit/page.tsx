import { requireRole } from "@/lib/permissions";
import { getAllEmailLogsAction } from "@/features/certificates/server/certificate.actions";
import AuditLogList from "@/features/certificates/components/audit-log-list";

export default async function AuditLogPage() {
  await requireRole(["admin"]);
  const logs = await getAllEmailLogsAction(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-700">Audit Log</h1>
        <p className="text-muted-foreground text-sm">
          Email delivery history for all certificates
        </p>
      </div>
      <AuditLogList initialLogs={logs} />
    </div>
  );
}
