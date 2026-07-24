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

export async function isEmailTemplateLocked(
  templateId: string,
  client?: SupabaseClient
): Promise<boolean> {
  const c = client ?? (await createClient());
  const events = await new eventRepo.EventRepository(c).findByEmailTemplateId(templateId);
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

const TEMPLATE_LISTING_COLUMNS = "id, name, description, organization_id, created_at, updated_at";

export async function getTemplates(
  organizationId: string,
  client?: SupabaseClient
): Promise<CertificateTemplate[]> {
  return repo(client ?? (await createClient())).findByOrganizationId(
    organizationId,
    TEMPLATE_LISTING_COLUMNS
  );
}

export async function getCertificateTemplates(
  organizationId: string,
  client?: SupabaseClient
): Promise<CertificateTemplate[]> {
  return repo(client ?? (await createClient())).findByOrganizationIdAndType(
    organizationId,
    'certificate',
    TEMPLATE_LISTING_COLUMNS
  );
}

export async function getEmailTemplates(
  organizationId: string,
  client?: SupabaseClient
): Promise<CertificateTemplate[]> {
  return repo(client ?? (await createClient())).findByOrganizationIdAndType(
    organizationId,
    'email',
    TEMPLATE_LISTING_COLUMNS
  );
}

export async function getTemplate(
  id: string,
  client?: SupabaseClient
): Promise<CertificateTemplate | null> {
  return repo(client ?? (await createClient())).findById(id);
}

export async function getEmailTemplate(
  id: string,
  client?: SupabaseClient
): Promise<CertificateTemplate | null> {
  const template = await repo(client ?? (await createClient())).findById(id);
  if (template && template.type !== 'email') return null;
  return template;
}

export async function createTemplate(
  data: Pick<CertificateTemplate, "organization_id" | "name" | "description" | "html_content" | "css_content"> & { type?: 'certificate' | 'email' },
  client?: SupabaseClient
): Promise<{ template: CertificateTemplate | null; error?: string }> {
  const r = repo(client ?? (await createClient()));
  const duplicate = await r.findByOrganizationIdAndName(data.organization_id, data.name);
  if (duplicate) {
    return { template: null, error: `A template named "${data.name}" already exists. Please choose a different name.` };
  }

  const { data: template, error } = await r.create({
    ...data,
    type: data.type ?? 'certificate',
  } as Partial<CertificateTemplate>);
  if (!template) {
    return { template: null, error: error ?? "Failed to create template" };
  }
  return { template };
}

export async function createEmailTemplate(
  data: Pick<CertificateTemplate, "organization_id" | "name" | "description" | "html_content" | "css_content">,
  client?: SupabaseClient
): Promise<{ template: CertificateTemplate | null; error?: string }> {
  return createTemplate({ ...data, type: 'email' }, client);
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

  if (data.name && data.name !== existing.name) {
    const duplicate = await r.findByOrganizationIdAndName(existing.organization_id, data.name);
    if (duplicate && duplicate.id !== id) {
      return { template: null, error: `A template named "${data.name}" already exists. Please choose a different name.` };
    }
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
