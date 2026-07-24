"use client";

import dynamic from "next/dynamic";
import { createEmailTemplateAction } from "@/features/templates/server/template.actions";
import { ORG_ID } from "@/lib/org";

const TemplateForm = dynamic(() => import("@/features/templates/components/email-template-form-v2"), { ssr: false });

export default function NewEmailTemplatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-700">New Email Template</h1>
        <p className="text-muted-foreground text-sm">
          Create a new email template for certificate notifications
        </p>
      </div>
      <TemplateForm
        submitLabel="Save Changes"
        onSubmit={async (data) => {
          return await createEmailTemplateAction({
            organization_id: ORG_ID,
            name: data.name,
            description: data.description,
            html_content: data.html_content,
            css_content: data.css_content,
          });
        }}
      />
    </div>
  );
}
