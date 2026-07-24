"use server";

import * as templateService from "./template.service";
import { requireRole } from "@/lib/permissions";

export async function getTemplatesAction(organizationId: string) {
  await requireRole(["admin", "staff"]);
  return templateService.getTemplatesWithLockState(organizationId);
}

export async function getCertificateTemplatesAction(organizationId: string) {
  await requireRole(["admin", "staff"]);
  return templateService.getCertificateTemplates(organizationId);
}

export async function getEmailTemplatesAction(organizationId: string) {
  await requireRole(["admin", "staff"]);
  return templateService.getEmailTemplates(organizationId);
}

export async function getTemplateAction(id: string) {
  await requireRole(["admin", "staff", "participant"]);
  return templateService.getTemplate(id);
}

export async function getEmailTemplateAction(id: string) {
  await requireRole(["admin", "staff", "participant"]);
  return templateService.getEmailTemplate(id);
}

export async function isTemplateLockedAction(id: string) {
  await requireRole(["admin", "staff"]);
  return templateService.isTemplateLocked(id);
}

export async function isEmailTemplateLockedAction(id: string) {
  await requireRole(["admin", "staff"]);
  return templateService.isEmailTemplateLocked(id);
}

export async function createTemplateAction(data: {
  organization_id: string;
  name: string;
  description?: string;
  html_content: string;
  css_content?: string;
}) {
  await requireRole(["admin", "staff"]);
  return templateService.createTemplate({
    ...data,
    description: data.description ?? null,
    css_content: data.css_content ?? null,
  });
}

export async function createEmailTemplateAction(data: {
  organization_id: string;
  name: string;
  description?: string;
  html_content: string;
  css_content?: string;
}) {
  await requireRole(["admin", "staff"]);
  return templateService.createEmailTemplate({
    ...data,
    description: data.description ?? null,
    css_content: data.css_content ?? null,
  });
}

export async function updateTemplateAction(
  id: string,
  data: {
    name?: string;
    description?: string;
    html_content?: string;
    css_content?: string;
  }
) {
  await requireRole(["admin", "staff"]);
  if (await templateService.isTemplateLocked(id)) {
    return { template: null, error: "This template is locked because it is used by an active or archived event. Archive the linked event(s) to edit it." };
  }
  return templateService.updateTemplate(id, {
    ...data,
    description: data.description ?? null,
    css_content: data.css_content ?? null,
  });
}

export async function deleteTemplateAction(id: string) {
  await requireRole(["admin"]);
  if (await templateService.isTemplateLocked(id)) {
    return { error: "This template is locked because it is used by an active or archived event. Archive the linked event(s) to delete it." };
  }
  return templateService.deleteTemplate(id);
}
