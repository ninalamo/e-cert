import { NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";
import { issueCertificatesWorkflow } from "@/workflows/issue-certificates";
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

  if (session.role !== "admin" && session.role !== "staff") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { attendeeIds, sendEmail } = body as {
    attendeeIds: string[];
    sendEmail?: boolean;
  };

  if (!Array.isArray(attendeeIds) || attendeeIds.length === 0) {
    return NextResponse.json(
      { error: "attendeeIds is required and must be a non-empty array" },
      { status: 400 }
    );
  }

  const run = await start(issueCertificatesWorkflow, [
    eventId,
    attendeeIds,
    session.id,
    sendEmail ?? true,
  ]);

  return NextResponse.json({ runId: run.runId }, { status: 202 });
}
