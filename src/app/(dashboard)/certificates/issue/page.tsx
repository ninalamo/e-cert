"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import IssueForm from "@/features/certificates/components/issue-form";
import { templatesApi } from "@/lib/api/templates";
import { ORG_ID } from "@/lib/org";
import type { CertificateTemplate } from "@/types/template";

export default function IssueCertificatePage() {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    templatesApi
      .list(ORG_ID)
      .then((result) => {
        if (!active) return;
        setTemplates(result.data ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Issue Certificate</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-tertiary">Loading templates...</p>
        ) : (
          <IssueForm initialTemplates={templates} />
        )}
      </CardContent>
    </Card>
  );
}
