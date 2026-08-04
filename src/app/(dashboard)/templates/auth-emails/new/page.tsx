"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { createAuthTemplateAction, updateTemplateAction, getCurrentRoleAction } from "@/features/templates/server/template.actions";
import { ORG_ID } from "@/lib/org";
import { AUTH_PROCESS_LABELS } from "@/features/templates/components/email-placeholder-field";
import type { AuthProcess } from "@/types/template";
import type { UserRole } from "@/lib/permissions";
import { useEmailPreview } from "@/features/templates/hooks/use-email-preview";

const AuthEmailEditor = dynamic(() => import("@/features/templates/components/auth-email-editor"), { ssr: false });

export default function NewAuthEmailPage() {
  const searchParams = useSearchParams();
  const initialProcess = searchParams.get("process") as AuthProcess | null;

  const [role, setRole] = useState<UserRole>("staff");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const { onPreview, PreviewDialog } = useEmailPreview();

  useEffect(() => {
    getCurrentRoleAction().then(setRole);
  }, []);

  if (role !== "admin") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-muted-foreground text-sm">
            Only administrators can manage auth email templates.
          </p>
        </div>
      </div>
    );
  }

  if (!initialProcess) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-red-600">Invalid Request</h1>
          <p className="text-muted-foreground text-sm">
            No auth process specified. Please go back and click Configure on a process.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-700">
          Configure: {AUTH_PROCESS_LABELS[initialProcess]}
        </h1>
        <p className="text-muted-foreground text-sm">
          Customize the email template for this authentication process
        </p>
      </div>
      <AuthEmailEditor
        initialData={{ name: "", description: "", html_content: "", auth_process: initialProcess }}
        lockProcess={true}
        onPreview={onPreview}
        onSubmit={async (data) => {
          if (createdId) {
            const result = await updateTemplateAction(createdId, data);
            return result;
          }
          const result = await createAuthTemplateAction({
            organization_id: ORG_ID,
            name: data.name,
            description: data.description,
            html_content: data.html_content,
            css_content: "",
            auth_process: data.auth_process!,
          });
          if (result.template) {
            setCreatedId(result.template.id);
          }
          return result;
        }}
      />
      <PreviewDialog />
    </div>
  );
}