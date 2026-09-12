import { api } from "./client";
import type { EventAttendee, AttendeeMetadata } from "@/types/event-attendee";
import type { ApiResponse, PaginatedResponse, PaginationMeta, PaginationLinks, BulkResponse } from "./types";

export interface AttendeeDeletePreview {
  attendee: EventAttendee;
  has_certificate: boolean;
  certificate_number: string | null;
}

export interface IssueCompletedResult {
  success: boolean;
  issued: number;
  failed: number;
  errors: string[];
}

export interface AttendeesListParams {
  search?: string;
  attended?: boolean;
  completed?: boolean;
  status?: "not_issued" | "issued" | "revoked" | "expired";
  limit?: number;
  offset?: number;
}

export interface AttendeesListResult {
  data: EventAttendee[];
  meta: PaginationMeta;
  links: PaginationLinks;
}

export const attendeesApi = {
  list: (eventId: string, params?: AttendeesListParams) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.attended !== undefined) qs.set("attended", String(params.attended));
    if (params?.completed !== undefined) qs.set("completed", String(params.completed));
    if (params?.status) qs.set("status", params.status);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset !== undefined) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return api.get<PaginatedResponse<EventAttendee>>(
      `/events/${eventId}/attendees${q ? `?${q}` : ""}`
    );
  },

  add: (
    eventId: string,
    data: {
      organization_id: string;
      name: string;
      email: string;
      metadata?: AttendeeMetadata;
    }
  ) =>
    api.post<ApiResponse<EventAttendee>>(
      `/events/${eventId}/attendees`,
      data
    ),

  update: (
    eventId: string,
    attendeeId: string,
    data: Partial<{
      name: string;
      email: string;
      attended: boolean;
      completed: boolean;
      metadata: Record<string, unknown>;
    }>
  ) =>
    api.patch<ApiResponse<EventAttendee>>(
      `/events/${eventId}/attendees/${attendeeId}`,
      data
    ),

  remove: (attendeeId: string) =>
    api.delete(`/attendees/${attendeeId}`).catch((err) => {
      if (err?.message?.includes("No query results")) return null;
      throw err;
    }),

  removeWithCert: (attendeeId: string) =>
    api.delete(`/attendees/${attendeeId}?with_cert=true`).catch((err) => {
      if (err?.message?.includes("No query results")) return null;
      throw err;
    }),

  getDeletePreview: (attendeeId: string) =>
    api.get<ApiResponse<AttendeeDeletePreview>>(
      `/attendees/${attendeeId}/delete-preview`
    ),

  getFileData: (attendeeId: string) =>
    api.get<ApiResponse<{ file_data: string; file_name: string; file_type: string }>>(
      `/attendees/${attendeeId}/file-data`
    ),

  getFileBlob: (attendeeId: string) =>
    api.get<Blob>(`/attendees/${attendeeId}/file-data`),

  bulkAdd: (
    eventId: string,
    data: {
      organization_id: string;
      attendees: Array<{ name: string; email: string; metadata?: AttendeeMetadata }>;
    }
  ) =>
    api.post<BulkResponse<EventAttendee>>(
      `/events/${eventId}/attendees/import`,
      data
    ),

  issueCompleted: (
    eventId: string,
    options?: { send_email?: boolean; attendee_ids?: string[] }
  ) =>
    api.post<ApiResponse<IssueCompletedResult>>(
      `/events/${eventId}/attendees/issue-completed`,
      options
    ),

  revokeExpired: (eventId: string) =>
    api.post<ApiResponse<{ revoked: number }>>(
      `/events/${eventId}/attendees/revoke-expired`
    ),

  reissueSelected: (eventId: string, attendeeIds: string[]) =>
    api.post<ApiResponse<IssueCompletedResult>>(
      `/events/${eventId}/attendees/reissue-selected`,
      { attendee_ids: attendeeIds }
    ),
};
