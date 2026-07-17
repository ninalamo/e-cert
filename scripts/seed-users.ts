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
import { reseed } from "../src/lib/seed";

async function main() {
  console.log("Seeding default users...");
  await reseed();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
