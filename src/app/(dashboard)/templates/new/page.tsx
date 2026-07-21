"use client";

import dynamic from "next/dynamic";
import { createTemplateAction } from "@/features/templates/server/template.actions";
import { ORG_ID } from "@/lib/org";

const TemplateForm = dynamic(() => import("@/features/templates/components/template-form"), { ssr: false });

export default function NewTemplatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-700">New Template</h1>
        <p className="text-muted-foreground text-sm">
          Create a new certificate template
        </p>
      </div>
      <TemplateForm
        submitLabel="Create Template"
        onSubmit={async (data) => {
          const result = await createTemplateAction({
            organization_id: ORG_ID,
            ...data,
          });
          if (!result?.error) {
            window.location.href = "/templates";
          }
          return result;
        }}
      />
    </div>
  );
}

