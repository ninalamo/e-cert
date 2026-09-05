"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TemplatesTable from "@/features/templates/components/templates-table";
import { templatesApi } from "@/lib/api/templates";
import { ORG_ID } from "@/lib/org";
import { PlusIcon } from "lucide-react";
import { SkeletonTable } from "@/components/ui/skeleton";
import type { CertificateTemplate } from "@/types/template";

type TemplateWithLock = CertificateTemplate & { locked: boolean };

export default function CertificateTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateWithLock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    templatesApi
      .listCertificateWithLock(ORG_ID)
      .then((result) => {
        if (!active) return;
        const raw = result.data ?? [];
        setTemplates(raw.map((t) => ({
          id: t.id,
          organization_id: t.organization_id,
          name: t.name,
          description: t.description,
          type: t.type,
          auth_process: t.auth_process,
          html_content: t.html_content,
          css_content: t.css_content,
          created_at: t.created_at,
          updated_at: t.updated_at,
          locked: t.is_locked,
        })));
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Certificate Templates
          </h1>
          <p className="mt-1 text-sm text-tertiary">
            Manage your certificate templates
          </p>
        </div>
        <Link href="/templates/certificates/new" className="btn">
          <PlusIcon className="size-4" />
          New Template
        </Link>
      </div>
      {loading ? <SkeletonTable /> : <TemplatesTable initialTemplates={templates} />}
    </div>
  );
}
