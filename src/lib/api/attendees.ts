import { api } from "./client";
import type { EventAttendee, AttendeeMetadata } from "@/types/event-attendee";
import type { ApiResponse, PaginationMeta, BulkResponse } from "./types";

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

export const attendeesApi = {
  list: (eventId: string) =>
    api.get<{ data: EventAttendee[] }>(
      `/events/${eventId}/attendees`
    ),

  listPaginated: (
    eventId: string,
    params?: { limit?: number; offset?: number }
  ) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return api.get<{ data: EventAttendee[]; meta: PaginationMeta }>(
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

  remove: (eventId: string, attendeeId: string) =>
    api.delete(`/events/${eventId}/attendees/${attendeeId}`),

  removeWithCert: (eventId: string, attendeeId: string) =>
    api.delete(`/events/${eventId}/attendees/${attendeeId}?with_cert=true`),

  getDeletePreview: (eventId: string, attendeeId: string) =>
    api.get<ApiResponse<AttendeeDeletePreview>>(
      `/events/${eventId}/attendees/${attendeeId}/delete-preview`
    ),

  getFileData: (eventId: string, attendeeId: string) =>
    api.get<ApiResponse<{ file_data: string; file_name: string; file_type: string }>>(
      `/events/${eventId}/attendees/${attendeeId}/file-data`
    ),

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
