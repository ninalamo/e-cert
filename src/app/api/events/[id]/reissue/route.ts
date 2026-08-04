import { NextRequest, NextResponse } from "next/server";
import { reissueCertificatesForSelected } from "@/features/events/server/attendee.service";
import { getCurrentSession } from "@/lib/permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { attendeeIds } = body as { attendeeIds: string[] };

  if (!Array.isArray(attendeeIds) || attendeeIds.length === 0) {
    return NextResponse.json(
      { error: "attendeeIds is required and must be a non-empty array" },
      { status: 400 }
    );
  }

  try {
    const result = await reissueCertificatesForSelected(
      eventId,
      attendeeIds,
      session.id
    );
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[Reissue] Failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to re-issue certificates" },
      { status: 500 }
    );
  }
}