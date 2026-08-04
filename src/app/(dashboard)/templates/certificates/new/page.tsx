"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createTemplateAction, updateTemplateAction } from "@/features/templates/server/template.actions";
import { ORG_ID } from "@/lib/org";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const TemplateForm = dynamic(() => import("@/features/templates/components/template-form"), { ssr: false });

export default function NewTemplatePage() {
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
            <BreadcrumbLink render={<Link href="/templates/certificates" />}>
              Certificates
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>New Certificate</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

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
          if (createdId) {
            const result = await updateTemplateAction(createdId, data);
            return result;
          }
          const result = await createTemplateAction({
            organization_id: ORG_ID,
            ...data,
          });
          if (result.template) {
            setCreatedId(result.template.id);
          }
          return result;
        }}
      />
    </div>
  );
}
