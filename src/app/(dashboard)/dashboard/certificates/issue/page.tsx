import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import IssueForm from "@/features/certificates/components/issue-form";

export default function IssueCertificatePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Issue Certificate</CardTitle>
      </CardHeader>
      <CardContent>
        <IssueForm />
      </CardContent>
    </Card>
  );
}
