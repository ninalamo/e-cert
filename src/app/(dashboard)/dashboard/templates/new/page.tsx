"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import TemplateForm from "@/features/templates/components/template-form";
import { createTemplateAction } from "@/features/templates/server/template.actions";

function NewTemplateInner() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("org");

  if (!orgId) {
    return <p className="text-muted-foreground">Select an organization first.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Template</h1>
        <p className="text-muted-foreground text-sm">
          Create a new certificate template
        </p>
      </div>
      <TemplateForm
        submitLabel="Create Template"
        onSubmit={async (data) => {
          const result = await createTemplateAction({
            organization_id: orgId,
            ...data,
          });
          if (!result?.error) {
            window.location.href = `/dashboard/templates?org=${orgId}`;
          }
          return result;
        }}
      />
    </div>
  );
}

export default function NewTemplatePage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm">Loading...</p>}>
      <NewTemplateInner />
    </Suspense>
  );
}
