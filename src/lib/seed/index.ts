import { createClient } from "@supabase/supabase-js";

export const ORG_ID = "d4444444-4444-4444-4444-444444444444";
export const SEED_PASSWORD = "password123";

export const SEED_USERS: { id: string; email: string; name: string; role: string }[] = [
  { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1", email: "admin@lyceumalabang.edu.ph",      name: "Admin User",      role: "admin" },
  { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2", email: "staff@lyceumalabang.edu.ph",      name: "Staff User",      role: "staff" },
  { id: "cccccccc-cccc-cccc-cccc-ccccccccccc3", email: "participant@lyceumalabang.edu.ph", name: "Participant User", role: "participant" },
];

export function getSeedAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function deleteSeededUsers(admin = getSeedAdmin()) {
  const { data } = await admin.auth.admin.listUsers();
  const seededEmails = new Set(SEED_USERS.map((u) => u.email));

  for (const user of data.users) {
    if (user.email && seededEmails.has(user.email)) {
      await admin.auth.admin.deleteUser(user.id);
    }
  }

  // Remove any leftover memberships for the fixed seed ids.
  await admin
    .from("user_memberships")
    .delete()
    .in("user_id", SEED_USERS.map((u) => u.id));
}

export async function seedUsers(admin = getSeedAdmin()) {
  for (const user of SEED_USERS) {
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list.users.find((u) => u.email === user.email);
    const userId = existing?.id ?? user.id;

    if (!existing) {
      const { data, error } = await admin.auth.admin.createUser({
        id: user.id,
        email: user.email,
        password: SEED_PASSWORD,
        email_confirm: true,
        user_metadata: { name: user.name },
      });
      if (error) throw new Error(`createUser ${user.email}: ${error.message}`);
      userId === user.id;
      void data;
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
