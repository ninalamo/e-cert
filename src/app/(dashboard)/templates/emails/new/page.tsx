"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { templatesApi } from "@/lib/api/templates";
import { ORG_ID } from "@/lib/org";
import { useEmailPreview } from "@/features/templates/hooks/use-email-preview";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const TemplateForm = dynamic(() => import("@/features/templates/components/email-template-form-v2"), { ssr: false });

export default function NewEmailTemplatePage() {
  const { onPreview, PreviewDialog } = useEmailPreview();
  const [fullscreen, setFullscreen] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

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
            <BreadcrumbLink render={<Link href="/templates/emails" />}>
              Emails
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>New Email Template</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-2xl font-bold text-brand-700">New Email Template</h1>
        <p className="text-muted-foreground text-sm">
          Create a new email template for certificate notifications
        </p>
      </div>
      <TemplateForm
        submitLabel="Save Changes"
        fullscreen={fullscreen}
        onFullscreenChange={setFullscreen}
        onClose={() => window.history.back()}
        onPreview={onPreview}
        onSubmit={async (data) => {
          try {
            if (createdId) {
              await templatesApi.update(createdId, data);
              return {};
            }
            const { data: created } = await templatesApi.createEmail({
              organization_id: ORG_ID,
              name: data.name,
              description: data.description,
              html_content: data.html_content,
              css_content: data.css_content,
            });
            if (created) {
              setCreatedId(created.id);
            }
            return {};
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Failed to save template";
            return { error: msg };
          }
        }}
      />
      <PreviewDialog />
    </div>
  );
}
