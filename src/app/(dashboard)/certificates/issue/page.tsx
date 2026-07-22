import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import IssueForm from "@/features/certificates/components/issue-form";
import { getTemplates } from "@/features/templates/server/template.service";
import { requireRole } from "@/lib/permissions";
import { ORG_ID } from "@/lib/org";

export default async function IssueCertificatePage() {
  await requireRole(["admin", "staff"]);
  const templates = await getTemplates(ORG_ID);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Issue Certificate</CardTitle>
      </CardHeader>
      <CardContent>
        <IssueForm initialTemplates={templates} />
      </CardContent>
    </Card>
  );
}
