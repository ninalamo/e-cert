import crypto from "crypto";
import { authConfig } from "./config";
import { supabaseAdmin } from "@/lib/supabase/admin";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export async function createRefreshToken(userId: string): Promise<string> {
  const raw = generateToken();
  const db = supabaseAdmin;
  await db.from("refresh_tokens").insert({
    user_id: userId,
    token_hash: hashToken(raw),
    expires_at: new Date(Date.now() + authConfig.refreshExpiry * 1000).toISOString(),
  });
  return raw;
}

export async function verifyRefreshToken(
  raw: string,
): Promise<{ userId: string } | null> {
  const db = supabaseAdmin;
  const hash = hashToken(raw);
  const { data } = await db
    .from("refresh_tokens")
    .select("user_id, expires_at")
    .eq("token_hash", hash)
    .single();

  if (!data) return null;
  if (new Date(data.expires_at) < new Date()) {
    await db.from("refresh_tokens").delete().eq("token_hash", hash);
    return null;
  }
  return { userId: data.user_id };
}

export async function deleteRefreshToken(raw: string): Promise<void> {
  const db = supabaseAdmin;
  await db.from("refresh_tokens").delete().eq("token_hash", hashToken(raw));
}

export async function deleteAllRefreshTokens(userId: string): Promise<void> {
  const db = supabaseAdmin;
  await db.from("refresh_tokens").delete().eq("user_id", userId);
}

export async function createResetToken(
  userId: string,
): Promise<string> {
  const raw = generateToken();
  const db = supabaseAdmin;
  await db.from("password_resets").insert({
    user_id: userId,
    token_hash: hashToken(raw),
    expires_at: new Date(Date.now() + authConfig.resetTokenExpiry * 1000).toISOString(),
  });
  return raw;
}

export async function verifyResetToken(
  raw: string,
): Promise<{ userId: string } | null> {
  const db = supabaseAdmin;
  const hash = hashToken(raw);
  const { data } = await db
    .from("password_resets")
    .select("user_id, expires_at")
    .eq("token_hash", hash)
    .single();

  if (!data) return null;
  if (new Date(data.expires_at) < new Date()) {
    await db.from("password_resets").delete().eq("token_hash", hash);
    return null;
  }
  return { userId: data.user_id };
}

export async function deleteResetToken(raw: string): Promise<void> {
  const db = supabaseAdmin;
  await db.from("password_resets").delete().eq("token_hash", hashToken(raw));
}

export async function createConfirmToken(
  userId: string,
): Promise<string> {
  const raw = generateToken();
  const db = supabaseAdmin;
  await db.from("email_confirmations").insert({
    user_id: userId,
    token_hash: hashToken(raw),
    expires_at: new Date(Date.now() + authConfig.confirmTokenExpiry * 1000).toISOString(),
  });
  return raw;
}

export async function verifyConfirmToken(
  raw: string,
): Promise<{ userId: string } | null> {
  const db = supabaseAdmin;
  const hash = hashToken(raw);
  const { data } = await db
    .from("email_confirmations")
    .select("user_id, expires_at")
    .eq("token_hash", hash)
    .single();

  if (!data) return null;
  if (new Date(data.expires_at) < new Date()) {
    await db.from("email_confirmations").delete().eq("token_hash", hash);
    return null;
  }
  return { userId: data.user_id };
}
