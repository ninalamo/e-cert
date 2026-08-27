import { api } from "./client";
import type { CertificateTemplate, AuthProcess } from "@/types/template";
import type { ApiResponse } from "./types";

export interface TemplateWithLock extends CertificateTemplate {
  is_locked: boolean;
}

export const templatesApi = {
  list: (organizationId: string) =>
    api.get<{ data: TemplateWithLock[] }>(
      `/templates?organization_id=${organizationId}`
    ),

  listCertificate: (organizationId: string) =>
    api.get<{ data: CertificateTemplate[] }>(
      `/templates?organization_id=${organizationId}&type=certificate`
    ),

  listCertificateWithLock: (organizationId: string) =>
    api.get<{ data: TemplateWithLock[] }>(
      `/templates?organization_id=${organizationId}&type=certificate&with_lock=true`
    ),

  listEmail: (organizationId: string) =>
    api.get<{ data: CertificateTemplate[] }>(
      `/templates?organization_id=${organizationId}&type=email`
    ),

  listEmailWithLock: (organizationId: string) =>
    api.get<{ data: TemplateWithLock[] }>(
      `/templates?organization_id=${organizationId}&type=email&with_lock=true`
    ),

  listAuth: (organizationId: string) =>
    api.get<{ data: CertificateTemplate[] }>(
      `/templates?organization_id=${organizationId}&type=auth`
    ),

  get: (id: string) => api.get<ApiResponse<CertificateTemplate>>(`/templates/${id}`),

  getEmail: (id: string) =>
    api.get<ApiResponse<CertificateTemplate>>(`/templates/${id}`),

  getAuthByProcess: (process: AuthProcess) =>
    api.get<ApiResponse<CertificateTemplate>>(
      `/templates/auth/${process}`
    ),

  create: (data: {
    organization_id: string;
    name: string;
    description?: string;
    html_content: string;
    css_content?: string;
  }) => api.post<ApiResponse<CertificateTemplate>>("/templates", data),

  createEmail: (data: {
    organization_id: string;
    name: string;
    description?: string;
    html_content: string;
    css_content?: string;
  }) =>
    api.post<ApiResponse<CertificateTemplate>>("/templates", {
      ...data,
      type: "email",
    }),

  createAuth: (data: {
    organization_id: string;
    name: string;
    description?: string;
    html_content: string;
    css_content?: string;
    auth_process: AuthProcess;
  }) =>
    api.post<ApiResponse<CertificateTemplate>>("/templates", {
      ...data,
      type: "auth",
    }),

  update: (
    id: string,
    data: Partial<{
      name: string;
      description: string;
      html_content: string;
      css_content: string;
      type: "certificate" | "email" | "auth";
      auth_process: AuthProcess | null;
    }>
  ) => api.patch<ApiResponse<CertificateTemplate>>(`/templates/${id}`, data),

  delete: (id: string) => api.delete(`/templates/${id}`),
};
