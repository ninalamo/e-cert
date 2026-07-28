import { NextRequest } from "next/server";
import { SEED_USERS, recreateAdmin, seedUsers } from "@/lib/seed";
import { supabaseAdmin } from "@/lib/supabase/admin";

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
  Note: The <code>DEFAULT_ADMIN_PASSWORD</code> environment variable must be set before updating.
</p>
<form method="POST" action="/api/health">
  <div style="margin-bottom: 16px;">
    <label style="display: block;margin-bottom: 8px;font-size: 14px;font-weight: 500;">Admin Email</label>
    <input type="email" name="email" required placeholder="Enter admin email"
      style="width: 100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px" />
  </div>
  <div style="margin-bottom: 16px;">
    <label style="display: block;margin-bottom: 8px;font-size: 14px;font-weight: 500;">Admin Password</label>
    <input type="password" name="password" required placeholder="Enter admin password"
      style="width: 100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px" />
  </div>
  <button type="submit" style="padding:8px 16px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer;width: 100%">
    Reset Admin Password
  </button>
</form>`),
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

function renderSuccess() {
  return new Response(
    html(`<div style="background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;padding:16px;border-radius:6px;margin-bottom:16px">
  <h2>✓ Admin credentials verified and all users re-seeded successfully!</h2>
  <p>All seeded users (admin, staff, participant) have been recreated with current environment variables.</p>
</div>
<form method="POST" action="/api/health">
  <div style="margin-bottom: 16px;">
    <label style="display: block;margin-bottom: 8px;font-size: 14px;font-weight: 500;">Admin Email</label>
    <input type="email" name="email" required placeholder="Enter admin email"
      style="width: 100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px" />
  </div>
  <div style="margin-bottom: 16px;">
    <label style="display: block;margin-bottom: 8px;font-size: 14px;font-weight: 500;">Admin Password</label>
    <input type="password" name="password" required placeholder="Enter admin password"
      style="width: 100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px" />
  </div>
  <button type="submit" style="padding:8px 16px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer;width: 100%">
    Reset Admin Password
  </button>
</form>`),
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

function renderResult(data: unknown) {
  return new Response(
    html(`<form method="POST" action="/api/health">
  <div style="margin-bottom: 16px;">
    <label style="display: block;margin-bottom: 8px;font-size: 14px;font-weight: 500;">Admin Email</label>
    <input type="email" name="email" required placeholder="Enter admin email"
      style="width: 100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px" />
  </div>
  <div style="margin-bottom: 16px;">
    <label style="display: block;margin-bottom: 8px;font-size: 14px;font-weight: 500;">Admin Password</label>
    <input type="password" name="password" required placeholder="Enter admin password"
      style="width: 100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px" />
  </div>
  <button type="submit" style="padding:8px 16px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer;width: 100%">
    Reset Admin Password
  </button>
</form>
<pre style="background:#f0fdf4;border:1px solid #bbf7d0;padding:16px;border-radius:6px;overflow:auto;max-height:70vh;margin-top:16px">${JSON.stringify(data, null, 2)}</pre>`),
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

export async function GET() {
  return renderForm();
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = formData.get("email") as string | null;
  const password = formData.get("password") as string | null;

  if (!email || !password) {
    return renderForm("Please provide both email and password");
  }

  const envEmail = process.env.DEFAULT_ADMIN_EMAIL || "admin@lyceumalabang.edu.ph";
  const envPassword = process.env.DEFAULT_ADMIN_PASSWORD || "password123";

  if (email !== envEmail) {
    return renderForm("email is wrong");
  }

  if (password !== envPassword) {
    return renderForm("password is wrong");
  }

  try {
    // Verify Supabase connection
    const { error } = await supabaseAdmin.from("users").select("id").limit(1);
    if (error) {
      return renderResult({
        status: "degraded",
        error: `Database connection error: ${error.message}`, 
      });
    }

    // Recreate admin with environment variables
    await recreateAdmin();
    
    // Create staff and participant users if they don't exist
    await seedUsers();
    
    return renderSuccess();
  } catch (err) {
    return renderResult({
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
