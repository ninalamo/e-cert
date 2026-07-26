import { createClient } from "@supabase/supabase-js";
import { hashPassword } from "@/lib/auth";

export const ORG_ID = "d4444444-4444-4444-4444-444444444444";
export const SEED_PASSWORD = "password123";

export const SEED_USERS: { id: string; email: string; name: string; role: string }[] = [
  { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1", email: "admin@lyceumalabang.edu.ph",      name: "Admin User",      role: "admin" },
  { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2", email: "staff@lyceumalabang.edu.ph",      name: "Staff User",      role: "staff" },
  { id: "cccccccc-cccc-cccc-cccc-ccccccccccc3", email: "participant@lyceumalabang.edu.ph", name: "Participant User", role: "participant" },
];

export function getSeedAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key);
}

export async function deleteSeededUsers(admin = getSeedAdmin()) {
  const seededEmails = SEED_USERS.map((u) => u.email);

  await admin
    .from("user_memberships")
    .delete()
    .in("user_id", SEED_USERS.map((u) => u.id));

  await admin
    .from("users")
    .delete()
    .in("email", seededEmails);
}

export async function seedUsers(admin = getSeedAdmin()) {
  const passwordHash = await hashPassword(SEED_PASSWORD);

  for (const user of SEED_USERS) {
    const { data: existing } = await admin
      .from("users")
      .select("id")
      .eq("email", user.email)
      .single();

    const userId = existing?.id ?? user.id;

    if (!existing) {
      const { error } = await admin.from("users").insert({
        id: user.id,
        email: user.email,
        password_hash: passwordHash,
        name: user.name,
        email_confirmed_at: new Date().toISOString(),
      });
      if (error) throw new Error(`createUser ${user.email}: ${error.message}`);
    }

    const { error } = await admin.from("user_memberships").upsert(
      {
        user_id: userId,
        organization_id: ORG_ID,
        role: user.role,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,organization_id" }
    );
    if (error) throw new Error(`membership ${user.email}: ${error.message}`);
  }
}

export async function reseed() {
  const admin = getSeedAdmin();
  await deleteSeededUsers(admin);
  await seedUsers(admin);
}
