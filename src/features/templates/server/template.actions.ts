"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import * as templateService from "./template.service";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

export async function getTemplatesAction(organizationId: string) {
  await requireAuth();
  return templateService.getTemplates(organizationId);
}

export async function getTemplateAction(id: string) {
  await requireAuth();
  return templateService.getTemplate(id);
}

export async function createTemplateAction(data: {
  organization_id: string;
  name: string;
  description?: string;
  html_content: string;
  css_content?: string;
}) {
  await requireAuth();
  return templateService.createTemplate({
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
  await requireAuth();
  return templateService.updateTemplate(id, {
    ...data,
    description: data.description ?? null,
    css_content: data.css_content ?? null,
  });
}

export async function deleteTemplateAction(id: string) {
  await requireAuth();
  return templateService.deleteTemplate(id);
}
