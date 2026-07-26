"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  getTemplateAction,
  updateTemplateAction,
  isEmailTemplateLockedAction,
  getCurrentRoleAction,
} from "@/features/templates/server/template.actions";

const TemplateForm = dynamic(() => import("@/features/templates/components/email-template-form-v2"), { ssr: false });
import type { CertificateTemplate } from "@/types/template";
import type { UserRole } from "@/lib/permissions";
import { SkeletonForm } from "@/components/ui/skeleton";
import EmailTemplatePreviewDialog from "@/features/templates/components/email-template-preview-dialog";

export default function EditEmailTemplateForm({ id }: { id: string }) {
  const router = useRouter();
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [previewName, setPreviewName] = useState("");
  const [role, setRole] = useState<UserRole>("staff");

  useEffect(() => {
    let active = true;
    (async () => {
      const [data, isLocked, userRole] = await Promise.all([
        getTemplateAction(id),
        isEmailTemplateLockedAction(id),
        getCurrentRoleAction(),
      ]);
      if (!active) return;
      setTemplate(data);
      setLocked(isLocked);
      setRole(userRole);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return <SkeletonForm />;
  }

  if (!template) {
    return <p className="text-red-600">Email template not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Edit Email Template</h1>
        <p className="text-tertiary text-sm mt-1">
          {locked ? "This template is locked and cannot be edited." : "Customize your email template design"}
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
        role={role}
        initialData={{
          name: template.name,
          description: template.description ?? "",
          html_content: template.html_content,
          css_content: template.css_content ?? "",
          type: template.type === 'auth' ? 'auth' : 'email',
          auth_process: template.auth_process,
        }}
        disabled={locked}
        submitLabel="Save Changes"
        fullscreen={fullscreen}
        onFullscreenChange={setFullscreen}
        onClose={() => router.push("/templates/emails")}
        onPreview={(html, name) => {
          setPreviewContent(html);
          setPreviewName(name);
          setPreviewOpen(true);
        }}
        onSubmit={async (data) => {
          if (locked) return { error: "Template is locked." };
          return await updateTemplateAction(id, data);
        }}
      />

      <EmailTemplatePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        html={previewContent}
        name={previewName}
      />
    </div>
  );
}
