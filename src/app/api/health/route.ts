import { NextRequest, NextResponse } from "next/server";
import { reseed, SEED_USERS, SEED_PASSWORD, getSeedAdmin } from "@/lib/seed";

function isLocalhost(request: NextRequest): boolean {
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("[::1]");
}

async function getSeededUsersDetail(admin: ReturnType<typeof getSeedAdmin>) {
  const { data } = await admin.auth.admin.listUsers();
  const seededEmails = new Set(SEED_USERS.map((u) => u.email));
  const authUsers = data.users.filter((u) => u.email && seededEmails.has(u.email));

  const { data: memberships } = await admin
    .from("user_memberships")
    .select("user_id, role, created_at, updated_at")
    .in("user_id", authUsers.map((u) => u.id));

  const membershipMap = new Map((memberships ?? []).map((m) => [m.user_id, m]));

  return authUsers.map((u) => {
    const seed = SEED_USERS.find((s) => s.email === u.email);
    const membership = membershipMap.get(u.id);
    return {
      email: u.email,
      name: seed?.name ?? u.user_metadata?.name ?? null,
      password: SEED_PASSWORD,
      role: membership?.role ?? "unknown",
      auth_created_at: u.created_at,
      auth_updated_at: u.updated_at,
      auth_last_sign_in_at: u.last_sign_in_at,
      membership_created_at: membership?.created_at ?? null,
      membership_updated_at: membership?.updated_at ?? null,
    };
  });
}

export async function GET(request: NextRequest) {
  if (!isLocalhost(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const admin = getSeedAdmin();
    const users = await getSeededUsersDetail(admin);
    const seededEmails = new Set(SEED_USERS.map((u) => u.email));

    return NextResponse.json({
      status: "ok",
      auth: "up",
      users,
      missing: SEED_USERS.map((u) => u.email).filter((e) => !users.some((u) => u.email === e)),
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
    const admin = getSeedAdmin();
    await reseed();
    const users = await getSeededUsersDetail(admin);
    return NextResponse.json({ status: "ok", message: "Reseeded default users", users });
  } catch (err) {
    return NextResponse.json(
      { status: "error", error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
