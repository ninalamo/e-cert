import { NextRequest } from "next/server";
import { SEED_USERS, SEED_PASSWORD } from "@/lib/seed";
import { supabaseAdmin } from "@/lib/supabase/admin";

const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || "password123";

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
      role: membership?.role ?? "unknown",
      created_at: u.created_at,
      banned_until: u.banned_until,
      membership_created_at: membership?.created_at ?? null,
      membership_updated_at: membership?.updated_at ?? null,
    };
  });
}

function html(body: string) {
  return `<!DOCTYPE html>
<html><head><title>Admin Master Reset</title></head><body style="font-family:system-ui;padding:32px;max-width:600px;margin:auto">
<h1>Admin Master Reset</h1>
${body}
</body></html>`;
}

function renderForm(error?: string) {
  const errorHtml = error
    ? `<div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:12px;border-radius:6px;margin-bottom:16px">${error}</div>`
    : "";
  return new Response(
    html(`${errorHtml}
<p style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;padding:12px;border-radius:6px;margin-bottom:16px">
  Note: The <code>DEFAULT_ADMIN_PASSWORD</code> environment variable must be set and the app redeployed before updating.
</p>
<form method="POST" action="/api/health">
  <input type="hidden" name="action" value="login" />
  <input type="password" name="password" required placeholder="Enter admin password"
    style="padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;width:250px" />
  <button type="submit" style="padding:8px 16px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer;margin-left:8px">
    Reset Admin Password
  </button>
</form>
<p style="margin-top:12px"><button type="submit" form="forgot-form" style="background:none;border:none;color:#2563eb;cursor:pointer;padding:0;font-size:14px">Forgot password?</button></p>
<form id="forgot-form" method="POST" action="/api/health">
  <input type="hidden" name="action" value="forgot" />
</form>`),
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

function renderResult(data: unknown) {
  return new Response(
    html(`<form method="POST" action="/api/health">
  <input type="hidden" name="action" value="login" />
  <input type="password" name="password" required placeholder="Enter admin password"
    style="padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;width:250px" />
  <button type="submit" style="padding:8px 16px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer;margin-left:8px">
    Reset Admin Password
  </button>
</form>
<pre style="background:#f0fdf4;border:1px solid #bbf7d0;padding:16px;border-radius:6px;overflow:auto;max-height:70vh;margin-top:16px">${JSON.stringify(data, null, 2)}</pre>`),
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

function renderMessage(message: string) {
  return new Response(
    html(`<div style="background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;padding:12px;border-radius:6px;margin-bottom:16px">${message}</div>
<form method="POST" action="/api/health">
  <input type="hidden" name="action" value="login" />
  <input type="password" name="password" required placeholder="Enter admin password"
    style="padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;width:250px" />
  <button type="submit" style="padding:8px 16px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer;margin-left:8px">
    Reset Admin Password
  </button>
</form>`),
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

export async function GET() {
  return renderForm();
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const password = formData.get("password");

  if (password !== DEFAULT_ADMIN_PASSWORD) {
    return renderForm("Incorrect password.");
  }

  try {
    const users = await getSeededUsersDetail();
    return renderResult({
      status: "ok",
      auth: "up",
      users,
      missing: SEED_USERS.map((u) => u.email).filter((e) => !users.some((u) => u.email === e)),
    });
  } catch (err) {
    return renderResult({
      status: "degraded",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
