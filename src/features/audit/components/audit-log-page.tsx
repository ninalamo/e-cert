import AuditLogTable from "./audit-log-table";
import { auditApi } from "@/lib/api/audit";

export default async function AuditLogPage() {
  const initialData = await auditApi.list({ limit: 20, offset: 0 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-700">Audit Log</h1>
        <p className="text-muted-foreground text-sm">
          Track all user activity: logins, registrations, email delivery, certificate operations, and system errors.
        </p>
      </div>
      <AuditLogTable initialData={initialData} />
    </div>
  );
}
