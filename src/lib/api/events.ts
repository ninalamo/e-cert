import { api } from "./client";
import type { Event } from "@/types/event";
import type { CertificateTemplate } from "@/types/template";
import type { ApiResponse, PaginationMeta } from "./types";

export interface EventStats {
  total_attendees: number;
  completed_attendees: number;
  certificates_issued: number;
  certificates_revoked: number;
}

export const eventsApi = {
  list: (params?: {
    search?: string;
    statuses?: string[];
    limit?: number;
    offset?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.statuses) qs.set("statuses", params.statuses.join(","));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return api.get<{ data: Event[]; meta: PaginationMeta }>(
      `/events${q ? `?${q}` : ""}`
    );
  },

  get: (id: string) => api.get<ApiResponse<Event>>(`/events/${id}`),

  getStats: (id: string) =>
    api.get<ApiResponse<EventStats>>(`/events/${id}/stats`),

  create: (data: {
    organization_id: string;
    name: string;
    description?: string;
    event_date?: string;
    location?: string;
    organizer?: string;
    certificate_title?: string;
    certificate_number_pattern?: string;
    valid_until?: string;
    template_id?: string;
    email_template_id?: string;
  }) => api.post<ApiResponse<Event>>("/events", data),

  update: (
    id: string,
    data: Partial<{
      name: string;
      description: string;
      event_date: string;
      location: string;
      organizer: string;
      certificate_title: string;
      certificate_number_pattern: string;
      valid_until: string;
      status: "draft" | "active" | "archive";
      template_id: string;
      email_template_id: string;
    }>
  ) => api.patch<ApiResponse<Event>>(`/events/${id}`, data),

  delete: (id: string) => api.delete(`/events/${id}`),

  cloneTemplate: (id: string) =>
    api.post<ApiResponse<{ template: CertificateTemplate }>>(
      `/events/${id}/clone-template`
    ),

  cloneEmailTemplate: (id: string) =>
    api.post<ApiResponse<{ template: CertificateTemplate }>>(
      `/events/${id}/clone-email-template`
    ),
};
