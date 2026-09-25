import { api } from "./client";
import type { Certificate } from "@/types/certificate";
import type { CertificateEmailLog } from "@/types/certificate-email";
import type { ApiResponse, PaginationMeta } from "./types";

export interface CertificateEventRef {
  id: string;
  name: string;
  status: string;
  is_public: boolean;
}

export interface CertificateWithEvent extends Certificate {
  events: { name: string } | null;
  event?: CertificateEventRef | null;
}

export interface IssueCertificateInput {
  organization_id: string;
  template_id?: string;
  recipient_name: string;
  recipient_email: string;
  expires_at?: string;
  file_path?: string;
  metadata?: Record<string, unknown>;
  send_email?: boolean;
}

export interface IssueFromEventInput {
  event_id: string;
  organization_id: string;
  recipient_name: string;
  recipient_email: string;
  send_email?: boolean;
}

export interface BulkIssueInput {
  event_id: string;
  organization_id: string;
  recipients: Array<{ name: string; email: string }>;
  send_email?: boolean;
}

export interface BulkIssueResult {
  name: string;
  email: string;
  success: boolean;
  certNumber?: string;
  error?: string;
}

export const certificatesApi = {
  list: (organizationId: string) =>
    api.get<{ data: Certificate[] }>(
      `/certificates?organization_id=${organizationId}`
    ),

  listWithEvent: (organizationId: string) =>
    api.get<{ data: CertificateWithEvent[] }>(
      `/certificates?organization_id=${organizationId}&with_event=true`
    ),

  listPaged: (params?: {
    search?: string;
    event_id?: string;
    status?: "active" | "revoked" | "expired";
    source?: "uploaded" | "system-generated";
    limit?: number;
    offset?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.search?.trim()) qs.set("search", params.search.trim());
    if (params?.event_id) qs.set("event_id", params.event_id);
    if (params?.status) qs.set("status", params.status);
    if (params?.source) qs.set("source", params.source);
    if (params?.limit != null) qs.set("limit", String(params.limit));
    if (params?.offset != null) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return api.get<{ data: CertificateWithEvent[]; meta: PaginationMeta }>(
      `/certificates${q ? `?${q}` : ""}`
    );
  },

  get: (id: string) => api.get<ApiResponse<Certificate>>(`/certificates/${id}`),

  getMy: () => api.get<{ data: CertificateWithEvent[] }>("/me/certificates"),

  getMyById: (id: string) =>
    api.get<ApiResponse<Certificate>>(`/me/certificates/${id}`),

  issue: (data: IssueCertificateInput) =>
    api.post<ApiResponse<{ certificate: Certificate; error?: string }>>(
      "/certificates",
      data
    ),

  issueFromEvent: (data: IssueFromEventInput) =>
    api.post<ApiResponse<{ certificate: Certificate; error?: string }>>(
      "/certificates",
      data
    ),

  bulkIssue: (data: BulkIssueInput) =>
    api.post<{ results: BulkIssueResult[] }>("/certificates/bulk", data),

  upload: (organizationId: string, certificateNumber: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("organization_id", organizationId);
    formData.append("certificate_number", certificateNumber);
    return api.upload<ApiResponse<{ file_path: string }>>(
      "/certificates/upload",
      formData
    );
  },

  downloadPdf: (id: string) =>
    api.get<Blob>(`/certificates/${id}/pdf`),

  revoke: (id: string, reason: string) =>
    api.post<ApiResponse<Certificate>>(`/certificates/${id}/revoke`, {
      reason,
    }),

  expireAll: () =>
    api.post<{ data: { revoked: number; expiring_count: number } }>(
      "/certificates/expire"
    ),

  delete: (id: string) => api.delete(`/certificates/${id}`),

  sendEmail: (id: string) =>
    api.post<ApiResponse<{ sent: boolean }>>(`/certificates/${id}/email`),

  getEmailLogs: (id: string) =>
    api.get<{ data: CertificateEmailLog[] }>(`/certificates/${id}/email-logs`),

  getAllEmailLogs: (limit = 50, offset = 0) =>
    api.get<{ data: CertificateEmailLog[] }>(
      `/certificates/email-logs?limit=${limit}&offset=${offset}`
    ),

  getQrCode: (certificateNumber: string) =>
    api.get<ApiResponse<{ data_url: string }>>(
      `/certificates/${certificateNumber}/qr`
    ),
};
