import { api } from "./client";
import type { Certificate } from "@/types/certificate";
import type { EventAttendee } from "@/types/event-attendee";
import type { ApiResponse } from "./types";

export interface VerifyResult {
  valid: boolean;
  certificate?: Certificate;
  event?: { name: string; event_date: string | null; location: string | null };
  attendee?: EventAttendee;
  error?: string;
}

export interface ViewResult {
  certificate: Certificate;
  event?: { name: string; event_date: string | null; location: string | null };
  qr_data_url?: string;
}

export const verifyApi = {
  verify: (number: string) =>
    api.get<ApiResponse<VerifyResult>>(`/verify/${encodeURIComponent(number)}`),

  view: (id: string) =>
    api.get<ApiResponse<ViewResult>>(`/view/${id}`),
};
