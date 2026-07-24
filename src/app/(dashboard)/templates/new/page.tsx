"use client";

import dynamic from "next/dynamic";
import { createTemplateAction, createEmailTemplateAction } from "@/features/templates/server/template.actions";
import { ORG_ID } from "@/lib/org";

const TemplateForm = dynamic(() => import("@/features/templates/components/template-form"), { ssr: false });

export default function NewTemplatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-700">New Template</h1>
        <p className="text-muted-foreground text-sm">
          Create a new certificate or email template
        </p>
      </div>
      <TemplateForm
        submitLabel="Save Changes"
        onSubmit={async (data) => {
          if (data.type === 'email') {
            return await createEmailTemplateAction({
              organization_id: ORG_ID,
              name: data.name,
              description: data.description,
              html_content: data.html_content,
              css_content: data.css_content,
            });
          }
          return await createTemplateAction({
            organization_id: ORG_ID,
            ...data,
          });
        }}
      />
    </div>
  );
}

