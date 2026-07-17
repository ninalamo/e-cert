"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  getTemplatesAction,
  deleteTemplateAction,
} from "../server/template.actions";
import type { CertificateTemplate } from "@/types/template";

function TemplatesListInner() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("org");
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadTemplates = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const data = await getTemplatesAction(orgId);
    setTemplates(data);
    setLoaded(true);
    setLoading(false);
  }, [orgId]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete template "${name}"?`)) return;
    const result = await deleteTemplateAction(id);
    if (result?.error) {
      alert(result.error);
    } else {
      loadTemplates();
    }
  }

  if (!orgId) {
    return <p className="text-muted-foreground">Select an organization first.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          {!loaded && !loading && (
            <button onClick={loadTemplates} className="text-sm text-blue-600 hover:underline">
              Load templates
            </button>
          )}
        </div>
        <a
          href={`/dashboard/templates/new?org=${orgId}`}
          className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          New Template
        </a>
      </div>

      {loading && <p className="text-muted-foreground text-sm">Loading templates...</p>}

      {!loading && loaded && templates.length === 0 && (
        <div className="border rounded-md p-8 text-center">
          <p className="text-muted-foreground">No templates yet. Create your first one.</p>
        </div>
      )}

      {!loading && loaded && templates.length > 0 && (
        <div className="border rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-left">Created</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium">
                    <a
                      href={`/dashboard/templates/${t.id}?org=${orgId}`}
                      className="hover:underline"
                    >
                      {t.name}
                    </a>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {t.description || "—"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <a
                      href={`/dashboard/templates/${t.id}?org=${orgId}`}
                      className="text-xs text-blue-600 hover:underline mr-3"
                    >
                      Edit
                    </a>
                    <button
                      onClick={() => handleDelete(t.id, t.name)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function TemplatesList() {
  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm">Loading...</p>}>
      <TemplatesListInner />
    </Suspense>
  );
}
