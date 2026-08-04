import { NextRequest, NextResponse } from "next/server";
import { revokeExpiredForEvent } from "@/features/events/server/attendee.service";
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

  try {
    const result = await revokeExpiredForEvent(eventId, session.id);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[RevokeExpired] Failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to revoke expired certificates" },
      { status: 500 }
    );
  }
}