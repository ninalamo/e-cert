"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  getTemplateAction,
  updateTemplateAction,
  isTemplateLockedAction,
} from "@/features/templates/server/template.actions";

const TemplateForm = dynamic(() => import("@/features/templates/components/template-form"), { ssr: false });
import type { CertificateTemplate } from "@/types/template";
import { SkeletonForm } from "@/components/ui/skeleton";
export default function EditTemplateForm({ id }: { id: string }) {
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await getTemplateAction(id);
      if (!active) return;
      setTemplate(data);
      const isLocked = await isTemplateLockedAction(id);
      if (!active) return;
      setLocked(isLocked);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return <SkeletonForm />;
  }

  if (!template) {
    return <p className="text-red-600">Template not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Edit Template</h1>
        <p className="text-tertiary text-sm mt-1">
          {locked ? "This template is locked and cannot be edited." : "Customize your certificate design"}
        </p>
      </div>

      {locked && (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-4 text-sm">
          <p className="text-[var(--color-danger-text)]">
            This template is locked because it is used by an active or
            archived event. Archive the linked event(s) to edit it.
          </p>
        </div>
      )}

      <TemplateForm
        key={template.id}
        initialData={{
          name: template.name,
          description: template.description ?? "",
          type: template.type,
          html_content: template.html_content,
          css_content: template.css_content ?? "",
        }}
        disabled={locked}
        submitLabel="Save Changes"
        onSubmit={async (data) => {
          if (locked) return { template: null, error: "Template is locked." };
          return await updateTemplateAction(id, data);
        }}
      />
    </div>
  );
}
