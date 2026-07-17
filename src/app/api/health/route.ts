import { NextRequest, NextResponse } from "next/server";
import { reseed, SEED_USERS, getSeedAdmin } from "@/lib/seed";

function isLocalhost(request: NextRequest): boolean {
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("[::1]");
}

export async function GET(request: NextRequest) {
  if (!isLocalhost(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const admin = getSeedAdmin();
    const { data } = await admin.auth.admin.listUsers();
    const seededEmails = new Set(SEED_USERS.map((u) => u.email));
    const present = data.users.filter((u) => u.email && seededEmails.has(u.email)).map((u) => u.email);

    return NextResponse.json({
      status: "ok",
      auth: "up",
      seeded: present,
      missing: SEED_USERS.map((u) => u.email).filter((e) => !present.includes(e)),
    });
  } catch (err) {
    return NextResponse.json(
      { status: "degraded", error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!isLocalhost(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await reseed();
    return NextResponse.json({ status: "ok", message: "Reseeded default users" });
  } catch (err) {
    return NextResponse.json(
      { status: "error", error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
