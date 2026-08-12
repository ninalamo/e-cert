"use client";

import EventDetail from "./event-detail";
import { parseAccessToken, getAccessToken } from "@/lib/auth";
import { canDelete, type UserRole } from "@/lib/permissions";
import { useSearchParams, useParams } from "next/navigation";

export default function EventDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const tab = searchParams.get("tab");

  const token = getAccessToken();
  const parsed = token ? parseAccessToken(token) : null;
  const permissions = parsed?.permissions ?? [];
  const hasAdmin = permissions.some((p: string) => p.startsWith("admin:"));
  const role: UserRole = hasAdmin ? "admin" : "participant";
  const canUserDelete = canDelete(role);

  return (
    <EventDetail
      eventId={id}
      canDelete={canUserDelete}
      initialTab={tab === "attendees" ? "attendees" : "details"}
    />
  );
}
