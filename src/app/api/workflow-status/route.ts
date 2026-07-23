import { NextRequest, NextResponse } from "next/server";
import { getRun } from "workflow/api";

export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get("runId");

  if (!runId) {
    return NextResponse.json({ error: "runId is required" }, { status: 400 });
  }

  const run = getRun(runId);

  if (!(await run.exists)) {
    return NextResponse.json({ error: "Workflow run not found" }, { status: 404 });
  }

  const status = await run.status;

  if (status === "completed") {
    const result = await run.returnValue;
    return NextResponse.json({ status, result });
  }

  if (status === "failed") {
    return NextResponse.json({ status, error: "Workflow failed" });
  }

  return NextResponse.json({ status });
}
