"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import TemplateForm from "@/features/templates/components/template-form";
import {
  getTemplateAction,
  updateTemplateAction,
} from "@/features/templates/server/template.actions";
import type { CertificateTemplate } from "@/types/template";

export default function EditTemplateForm({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("org");
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadTemplate = useCallback(async () => {
    setLoading(true);
    const data = await getTemplateAction(id);
    setTemplate(data);
    setLoaded(true);
    setLoading(false);
  }, [id]);

  if (!loaded && !loading) {
    loadTemplate();
    return <p className="text-muted-foreground text-sm">Loading template...</p>;
  }

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading template...</p>;
  }

  if (!template) {
    return <p className="text-red-600">Template not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Template</h1>
        <p className="text-muted-foreground text-sm">
          Editing: {template.name}
        </p>
      </div>
      <TemplateForm
        initialData={{
          name: template.name,
          description: template.description ?? "",
          html_content: template.html_content,
          css_content: template.css_content ?? "",
        }}
        submitLabel="Save Changes"
        onSubmit={async (data) => {
          const result = await updateTemplateAction(id, data);
          if (!result?.error) {
            window.location.href = `/dashboard/templates?org=${orgId ?? template.organization_id}`;
          }
          return result;
        }}
      />
    </div>
  );
}
