import { z } from "zod";

const authProcessSchema = z.enum([
  "registration",
  "forgot_password",
  "confirm_email",
  "password_reset",
  "welcome",
]);

export const createTemplateSchema = z.object({
  organization_id: z.string().min(1, "Organization ID is required"),
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  html_content: z.string().min(1, "HTML content is required"),
  css_content: z.string().optional(),
});

export const createEmailTemplateSchema = z.object({
  organization_id: z.string().min(1, "Organization ID is required"),
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  html_content: z.string().min(1, "HTML content is required"),
  css_content: z.string().optional(),
});

export const createAuthTemplateSchema = z.object({
  organization_id: z.string().min(1, "Organization ID is required"),
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  html_content: z.string().min(1, "HTML content is required"),
  css_content: z.string().optional(),
  auth_process: authProcessSchema,
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  html_content: z.string().optional(),
  css_content: z.string().optional(),
  type: z.enum(["certificate", "email", "auth"]).optional(),
  auth_process: authProcessSchema.nullable().optional(),
});
