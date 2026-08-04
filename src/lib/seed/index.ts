import { hashPassword } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const ORG_ID = "d4444444-4444-4444-4444-444444444444";
export const SEED_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || "Password123!";

export const SEED_USERS: { id: string; email: string; name: string; role: string }[] = [
  { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1", email: process.env.DEFAULT_ADMIN_EMAIL || "admin@lyceumalabang.edu.ph", name: "Admin User", role: "admin" },
  { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2", email: "staff@lyceumalabang.edu.ph", name: "Staff User", role: "staff" },
  { id: "cccccccc-cccc-cccc-cccc-ccccccccccc3", email: "participant@lyceumalabang.edu.ph", name: "Participant User", role: "participant" },
];

export async function initializeDbWithSeededUsers() {
  for (const user of SEED_USERS) {
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", user.email)
      .single();

    const userId = existing?.id ?? user.id;

    if (!existing) {
      const passwordHash = await hashPassword(SEED_PASSWORD);
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

export async function recreateAdmin() {
  const adminUser = SEED_USERS.find((u) => u.role === "admin");
  if (!adminUser) throw new Error("Could not find admin user in SEED_USERS");

  const { data: existingAdminByEmail } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", adminUser.email)
    .single();

  const { data: existingByUuid } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("id", adminUser.id)
    .single();

  const uuidExists = !!existingByUuid;
  const emailExists = !!existingAdminByEmail;

  if (emailExists && existingAdminByEmail.id !== adminUser.id) {
    await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", existingAdminByEmail.id);

    await supabaseAdmin
      .from("user_memberships")
      .delete()
      .eq("user_id", existingAdminByEmail.id);
  }

  try {
    const passwordHash = await hashPassword(SEED_PASSWORD);
    const { error } = await supabaseAdmin.from("users").upsert(
      {
        id: adminUser.id,
        email: adminUser.email,
        password_hash: passwordHash,
        name: adminUser.name,
        email_confirmed_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    
    if (error && !error.message.includes("duplicate key")) {
      throw new Error(`createUser ${adminUser.email}: ${error.message}`);
    }

    const { data: adminUserByUuid } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", adminUser.id)
      .single();

    if (!adminUserByUuid) {
      throw new Error("Failed to create admin user");
    }

    const { error: membershipError } = await supabaseAdmin.from("user_memberships").upsert(
      {
        user_id: adminUser.id,
        organization_id: ORG_ID,
        role: adminUser.role,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,organization_id" }
    );
    if (membershipError && !membershipError.message.includes("duplicate key")) {
      throw new Error(`membership ${adminUser.email}: ${membershipError.message}`);
    }

    const action = uuidExists && emailExists ? "Updated existing admin user" : 
                   uuidExists ? "Updated admin user by UUID" : 
                   "Created new admin user";
    return { message: action, id: adminUser.id };
  } catch (err) {
    console.warn(`Recreate admin error for ${adminUser.email}:`, err);
    throw err;
  }
}

export async function seedAllUsers() {
  await recreateAdmin();
  await reseed();
}