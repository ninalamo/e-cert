import { CertificateTemplateRepository } from "./template.repository";
import type { CertificateTemplate } from "@/types/template";

const templateRepo = new CertificateTemplateRepository();

export async function getTemplates(organizationId: string): Promise<CertificateTemplate[]> {
  return templateRepo.findByOrganizationId(organizationId);
}

export async function getTemplate(id: string): Promise<CertificateTemplate | null> {
  return templateRepo.findById(id);
}

export async function createTemplate(
  data: Pick<CertificateTemplate, "organization_id" | "name" | "description" | "html_content" | "css_content">
): Promise<{ template: CertificateTemplate | null; error?: string }> {
  const template = await templateRepo.create(data as Partial<CertificateTemplate>);
  if (!template) {
    return { template: null, error: "Failed to create template" };
  }
  return { template };
}

export async function updateTemplate(
  id: string,
  data: Partial<Pick<CertificateTemplate, "name" | "description" | "html_content" | "css_content">>
): Promise<{ template: CertificateTemplate | null; error?: string }> {
  const existing = await templateRepo.findById(id);
  if (!existing) {
    return { template: null, error: "Template not found" };
  }

  const template = await templateRepo.update(id, data as Partial<CertificateTemplate>);
  if (!template) {
    return { template: null, error: "Failed to update template" };
  }
  return { template };
}

export async function deleteTemplate(id: string): Promise<{ error?: string }> {
  const existing = await templateRepo.findById(id);
  if (!existing) {
    return { error: "Template not found" };
  }

  const deleted = await templateRepo.delete(id);
  if (!deleted) {
    return { error: "Failed to delete template" };
  }
  return {};
}
