import { hashPassword } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const ORG_ID = "d4444444-4444-4444-4444-444444444444";
export const SEED_PASSWORD = process.env.HEALTH_PASSWORD || "password123";

export const SEED_USERS: { id: string; email: string; name: string; role: string }[] = [
  { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1", email: "admin@lyceumalabang.edu.ph",      name: "Admin User",      role: "admin" },
  { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2", email: "staff@lyceumalabang.edu.ph",      name: "Staff User",      role: "staff" },
  { id: "cccccccc-cccc-cccc-cccc-ccccccccccc3", email: "participant@lyceumalabang.edu.ph", name: "Participant User", role: "participant" },
];

export async function deleteSeededUsers() {
  const seededEmails = SEED_USERS.map((u) => u.email);

  await supabaseAdmin
    .from("user_memberships")
    .delete()
    .in("user_id", SEED_USERS.map((u) => u.id));

  await supabaseAdmin
    .from("users")
    .delete()
    .in("email", seededEmails);
}

export async function seedUsers() {
  const passwordHash = await hashPassword(SEED_PASSWORD);

  for (const user of SEED_USERS) {
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", user.email)
      .single();

    const userId = existing?.id ?? user.id;

    if (!existing) {
      const { error } = await supabaseAdmin.from("users").insert({
        id: user.id,
        email: user.email,
        password_hash: passwordHash,
        name: user.name,
        email_confirmed_at: new Date().toISOString(),
      });
      if (error) throw new Error(`createUser ${user.email}: ${error.message}`);
    }

    const { error } = await supabaseAdmin.from("user_memberships").upsert(
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
  await deleteSeededUsers();
  await seedUsers();
}