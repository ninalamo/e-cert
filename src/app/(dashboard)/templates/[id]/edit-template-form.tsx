"use client";

import { useState, useCallback } from "react";
import TemplateForm from "@/features/templates/components/template-form";
import {
  getTemplateAction,
  updateTemplateAction,
  isTemplateLockedAction,
} from "@/features/templates/server/template.actions";
import type { CertificateTemplate } from "@/types/template";
import { SkeletonForm } from "@/components/ui/skeleton";

export default function EditTemplateForm({ id }: { id: string }) {
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [locked, setLocked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadTemplate = useCallback(async () => {
    setLoading(true);
    const data = await getTemplateAction(id);
    setTemplate(data);
    setLocked(await isTemplateLockedAction(id));
    setLoaded(true);
    setLoading(false);
  }, [id]);

  if (!loaded && !loading) {
    loadTemplate();
    return <SkeletonForm />;
  }

  if (loading) {
    return <SkeletonForm />;
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
      {locked && (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-3 text-sm">
          <p className="text-[var(--color-danger-text)]">
            This template is locked because it is used by a draft or active
            event. Archive the linked event(s) to edit it.
          </p>
        </div>
      )}
      <TemplateForm
        initialData={{
          name: template.name,
          description: template.description ?? "",
          html_content: template.html_content,
          css_content: template.css_content ?? "",
        }}
        disabled={locked}
        submitLabel="Save Changes"
        onSubmit={async (data) => {
          if (locked) return { template: null, error: "Template is locked." };
          const result = await updateTemplateAction(id, data);
          if (!result?.error) {
            window.location.href = "/templates";
          }
          return result;
        }}
      />
    </div>
  );
}
