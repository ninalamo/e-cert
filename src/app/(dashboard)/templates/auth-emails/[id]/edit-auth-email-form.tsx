"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  getTemplateAction,
  updateTemplateAction,
  getCurrentRoleAction,
} from "@/features/templates/server/template.actions";

const AuthEmailEditor = dynamic(() => import("@/features/templates/components/auth-email-editor"), { ssr: false });
import type { CertificateTemplate } from "@/types/template";
import type { UserRole } from "@/lib/permissions";
import { SkeletonForm } from "@/components/ui/skeleton";
import { useEmailPreview } from "@/features/templates/hooks/use-email-preview";

export default function EditAuthEmailForm({ id }: { id: string }) {
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>("staff");
  const { onPreview, PreviewDialog } = useEmailPreview();

  useEffect(() => {
    let active = true;
    (async () => {
      const [data, userRole] = await Promise.all([
        getTemplateAction(id),
        getCurrentRoleAction(),
      ]);
      if (!active) return;
      setTemplate(data);
      setRole(userRole);
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

  if (template.type !== 'auth') {
    return <p className="text-red-600">This is not an auth email template.</p>;
  }

  if (role !== "admin") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-muted-foreground text-sm">
            Only administrators can edit auth email templates.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Edit Auth Email Template</h1>
        <p className="text-tertiary text-sm mt-1">
          Customize your authentication email template
        </p>
      </div>

      <AuthEmailEditor
        key={template.id}
        initialData={{
          name: template.name,
          description: template.description ?? "",
          html_content: template.html_content,
          auth_process: template.auth_process,
        }}
        lockProcess={true}
        onPreview={onPreview}
        onSubmit={async (data) => {
          return await updateTemplateAction(id, data);
        }}
      />

      <PreviewDialog />
    </div>
  );
}