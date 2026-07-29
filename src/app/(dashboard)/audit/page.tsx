import { requireRole } from "@/lib/permissions";
import AuditLogPage from "@/features/audit/components/audit-log-page";

export default async function AuditLogRoute() {
  await requireRole(["admin"]);
  return <AuditLogPage />;
}
