/**
 * Seed default users for every role (admin / staff / participant) into the
 * Supabase Auth service via the Admin API.
 *
 * Why a script instead of raw SQL inserts into auth.users:
 * Direct INSERTs into auth.users produce an encrypted_password that the
 * current GoTrue rejects on `grant_type=password` (500 errors). The Admin
 * API hashes the password exactly the way GoTrue expects.
 *
 * Run with:  npx tsx scripts/seed-users.ts
 *
 * Requires env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { recreateAdmin, seedUsers } from "../src/lib/seed";

async function main() {
  // Check for command line arguments
  const args = process.argv.slice(2);
  const emailArg = args.find((arg) => arg.startsWith("--email"));
  const passwordArg = args.find((arg) => arg.startsWith("--password"));
  
  let email = emailArg ? emailArg.split("=")[1] : process.env.DEFAULT_ADMIN_EMAIL;
  let password = passwordArg ? passwordArg.split("=")[1] : process.env.DEFAULT_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("Usage: npx tsx scripts/seed-users.ts --email=<email> --password=<password>");
    console.log("Or set environment variables: DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD");
    process.exit(1);
  }

  console.log("Seeding default users...");

  // Validate against environment variables
  if (email !== process.env.DEFAULT_ADMIN_EMAIL) {
    console.log(`WARNING: Email ${email} doesn't match DEFAULT_ADMIN_EMAIL from .env`);
  }

  if (password !== process.env.DEFAULT_ADMIN_PASSWORD) {
    console.log(`WARNING: Password doesn't match DEFAULT_ADMIN_PASSWORD from .env`);
  }

  // Recreate admin with environment variables
  console.log("Recreating admin user...");
  const adminResult = await recreateAdmin();
  console.log(`Admin user ${adminResult.message} (ID: ${adminResult.id})`);

  // Seed the other two users (staff and participant) if they don't exist
  console.log("Seeding other users (staff and participant)...");
  await seedUsers();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
