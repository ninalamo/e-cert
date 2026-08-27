import { api } from "./client";
import type { ApiResponse } from "./types";

export interface ManagedUser {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  role: string | null;
  is_attendee: boolean;
  is_main_admin: boolean;
}

export const usersApi = {
  list: () => api.get<{ data: ManagedUser[] }>("/admin/users"),

  setRole: (userId: string, role: string) =>
    api.patch<ApiResponse<{ error?: string }>>(`/admin/users/${userId}/role`, { role }),

  ban: (userId: string) =>
    api.post<ApiResponse<{ error?: string }>>(`/admin/users/${userId}/ban`),

  unban: (userId: string) =>
    api.post<ApiResponse<{ error?: string }>>(`/admin/users/${userId}/unban`),

  delete: (userId: string) =>
    api.delete(`/admin/users/${userId}`),
};
