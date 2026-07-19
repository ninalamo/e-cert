import { CertificateTemplateRepository } from "./template.repository";
import type { CertificateTemplate } from "@/types/template";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as eventRepo from "@/features/events/server/event.repository";
import type { Event } from "@/types/event";

const LIVE_STATUSES: Event["status"][] = ["draft", "active", "archive"];

function repo(client: SupabaseClient) {
  return new CertificateTemplateRepository(client);
}

export async function isTemplateLocked(
  templateId: string,
  client?: SupabaseClient
): Promise<boolean> {
  const c = client ?? (await createClient());
  const events = await new eventRepo.EventRepository(c).findByTemplateId(templateId);
  return events.some(
    (e) => e.status !== "draft" && LIVE_STATUSES.includes(e.status)
  );
}

export async function getTemplatesWithLockState(
  organizationId: string,
  client?: SupabaseClient
): Promise<(CertificateTemplate & { locked: boolean })[]> {
  const c = client ?? (await createClient());
  const templates = await repo(c).findByOrganizationId(organizationId);
  const eventR = new eventRepo.EventRepository(c);
  const linkedEvents = (await eventR.findByOrganizationId(organizationId)).filter(
    (e) => e.status !== "draft"
  );
  const lockedIds = new Set(
    linkedEvents.map((e) => e.template_id).filter((id): id is string => !!id)
  );
  return templates.map((t) => ({ ...t, locked: lockedIds.has(t.id) }));
}

export async function getTemplates(
  organizationId: string,
  client?: SupabaseClient
): Promise<CertificateTemplate[]> {
  return repo(client ?? (await createClient())).findByOrganizationId(organizationId);
}

export async function getTemplate(
  id: string,
  client?: SupabaseClient
): Promise<CertificateTemplate | null> {
  return repo(client ?? (await createClient())).findById(id);
}

export async function createTemplate(
  data: Pick<CertificateTemplate, "organization_id" | "name" | "description" | "html_content" | "css_content">,
  client?: SupabaseClient
): Promise<{ template: CertificateTemplate | null; error?: string }> {
  const { data: template, error } = await repo(client ?? (await createClient())).create(data as Partial<CertificateTemplate>);
  if (!template) {
    return { template: null, error: error ?? "Failed to create template" };
  }
  return { template };
}

export async function updateTemplate(
  id: string,
  data: Partial<Pick<CertificateTemplate, "name" | "description" | "html_content" | "css_content">>,
  client?: SupabaseClient
): Promise<{ template: CertificateTemplate | null; error?: string }> {
  const r = repo(client ?? (await createClient()));
  const existing = await r.findById(id);
  if (!existing) {
    return { template: null, error: "Template not found" };
  }

  const template = await r.update(id, data as Partial<CertificateTemplate>);
  if (!template) {
    return { template: null, error: "Failed to update template" };
  }
  return { template };
}

export async function deleteTemplate(
  id: string,
  client?: SupabaseClient
): Promise<{ error?: string }> {
  const r = repo(client ?? (await createClient()));
  const existing = await r.findById(id);
  if (!existing) {
    return { error: "Template not found" };
  }

  const deleted = await r.delete(id);
  if (!deleted) {
    return { error: "Failed to delete template" };
  }
  return {};
}
