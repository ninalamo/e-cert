"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { templatesApi } from "@/lib/api/templates";

const TemplateForm = dynamic(() => import("@/features/templates/components/template-form"), { ssr: false });
import type { CertificateTemplate } from "@/types/template";
import { SkeletonForm } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
export default function EditTemplateForm({ id }: { id: string }) {
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: templateData } = await templatesApi.get(id);
        if (!active) return;
        setTemplate(templateData);
        setLocked(templateData?.is_locked ?? false);
      } catch {
        if (active) setTemplate(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return <SkeletonForm />;
  }

  if (!template) {
    return <p className="text-red-600">Template not found.</p>;
  }

  if (template.type === 'auth') {
    return <p className="text-red-600">Auth templates cannot be edited here. Use the Email Templates page.</p>;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/templates" />}>
              Templates
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/templates/certificates" />}>
              Certificates
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{template.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

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
         templateType={template.type as 'certificate' | 'email'}
         initialData={{
           name: template.name,
           description: template.description ?? "",
           type: template.type as 'certificate' | 'email',
           html_content: template.html_content,
           css_content: template.css_content ?? "",
         }}
         disabled={locked}
         submitLabel="Save Changes"
         fullscreen={fullscreen}
         onFullscreenChange={setFullscreen}
          onSubmit={async (data) => {
            if (locked) return { template: null, error: "Template is locked." };
            try {
              await templatesApi.update(id, data);
              return {};
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : "Failed to update template";
              return { error: msg };
            }
          }}
       />
    </div>
  );
}
