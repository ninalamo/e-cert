import { NextRequest, NextResponse } from "next/server";
import { reseed, SEED_USERS, SEED_PASSWORD } from "@/lib/seed";
import { supabaseAdmin } from "@/lib/supabase/admin";

const HEALTH_PASSWORD = process.env.HEALTH_PASSWORD;

function isAuthorized(request: NextRequest): boolean {
  if (!HEALTH_PASSWORD) {
    console.error("[health] HEALTH_PASSWORD env var not set");
    return false;
  }
  return request.headers.get("x-health-password") === HEALTH_PASSWORD;
}

async function getSeededUsersDetail() {
  const seededEmails = SEED_USERS.map((u) => u.email);

  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, email, name, created_at, banned_until")
    .in("email", seededEmails);

  if (!users) return [];

  const userIds = users.map((u) => u.id);

  const { data: memberships } = await supabaseAdmin
    .from("user_memberships")
    .select("user_id, role, created_at, updated_at")
    .in("user_id", userIds);

  const membershipMap = new Map((memberships ?? []).map((m) => [m.user_id, m]));

  return users.map((u) => {
    const seed = SEED_USERS.find((s) => s.email === u.email);
    const membership = membershipMap.get(u.id);
    return {
      email: u.email,
      name: seed?.name ?? u.name ?? null,
      password: SEED_PASSWORD,
      role: membership?.role ?? "unknown",
      created_at: u.created_at,
      banned_until: u.banned_until,
      membership_created_at: membership?.created_at ?? null,
      membership_updated_at: membership?.updated_at ?? null,
    };
  });
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const users = await getSeededUsersDetail();

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
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await reseed();
    const users = await getSeededUsersDetail();
    return NextResponse.json({ status: "ok", message: "Reseeded default users", users });
  } catch (err) {
    return NextResponse.json(
      { status: "error", error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
