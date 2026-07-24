"use client";

import dynamic from "next/dynamic";
import { createTemplateAction, createEmailTemplateAction } from "@/features/templates/server/template.actions";
import { ORG_ID } from "@/lib/org";

const TemplateForm = dynamic(() => import("@/features/templates/components/template-form"), { ssr: false });

export default function NewTemplatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-700">New Certificate Template</h1>
        <p className="text-muted-foreground text-sm">
          Create a new certificate template
        </p>
      </div>
      <TemplateForm
        templateType="certificate"
        submitLabel="Save Changes"
        onSubmit={async (data) => {
          return await createTemplateAction({
            organization_id: ORG_ID,
            ...data,
          });
        }}
      />
    </div>
  );
}

