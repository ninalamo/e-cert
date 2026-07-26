"use server";

import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { ORG_ID } from "@/lib/org";
import { DEFAULT_ROLE, getHomePathForRole, getCurrentSession } from "@/lib/permissions";
import { loginSchema, type RegisterInput } from "../schemas/auth.schema";
import {
  hashPassword,
  comparePassword,
  setSession,
  clearSession,
  createRefreshToken,
  createResetToken,
  verifyResetToken,
  deleteResetToken,
  createConfirmToken,
  verifyConfirmToken,
} from "@/lib/auth";
import {
  sendConfirmationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendEmailConfirmedEmail,
} from "@/lib/email/auth-emails";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}

export async function loginAction(
  _prev: { error?: string; success?: boolean; redirectTo?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string; success?: boolean; redirectTo?: string }> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const db = supabaseAdmin();
  const { data: user, error: fetchError } = await db
    .from("users")
    .select("id, email, name, password_hash, banned_until, email_confirmed_at")
    .eq("email", parsed.data.email)
    .single();

  if (fetchError || !user) {
    return { error: "Invalid email or password" };
  }

  if (user.banned_until && new Date(user.banned_until) > new Date()) {
    return { error: "Account is banned" };
  }

  if (!user.email_confirmed_at) {
    return { error: "Please confirm your email before logging in." };
  }

  const valid = await comparePassword(parsed.data.password, user.password_hash);
  if (!valid) {
    return { error: "Invalid email or password" };
  }

  await setSession({ sub: user.id, email: user.email, name: user.name });
  await createRefreshToken(user.id);

  const { data: membership } = await db
    .from("user_memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", ORG_ID)
    .single();

  const role = (membership?.role ?? DEFAULT_ROLE) as import("@/types/organization").UserRole;
  const redirectTo = getHomePathForRole(role);

  return { success: true, redirectTo };
}

export async function register(data: RegisterInput) {
  const db = supabaseAdmin();

  const { data: existing } = await db
    .from("users")
    .select("id")
    .eq("email", data.email)
    .single();

  if (existing) {
    return { error: "Email already registered" };
  }

  const passwordHash = await hashPassword(data.password);

  const { data: user, error: insertError } = await db
    .from("users")
    .insert({
      email: data.email,
      password_hash: passwordHash,
      name: data.name,
    })
    .select("id")
    .single();

  if (insertError || !user) {
    return { error: insertError?.message ?? "Failed to create account" };
  }

  await db.from("user_memberships").insert({
    user_id: user.id,
    organization_id: ORG_ID,
    role: DEFAULT_ROLE,
  });

  const confirmToken = await createConfirmToken(user.id);
  await sendConfirmationEmail(data.email, confirmToken);
  await sendWelcomeEmail(data.email, data.name);

  return { success: true };
}

export async function logout() {
  await clearSession();
  redirect("/login");
}

export async function forgotPassword(data: { email: string }): Promise<{ error?: string; success?: boolean }> {
  const db = supabaseAdmin();

  const { data: user } = await db
    .from("users")
    .select("id")
    .eq("email", data.email)
    .single();

  if (!user) {
    return { success: true };
  }

  const resetToken = await createResetToken(user.id);
  await sendPasswordResetEmail(data.email, resetToken);

  return { success: true };
}

export async function updatePassword(data: { password: string }) {
  const session = await getCurrentSession();
  if (!session) {
    return { error: "Not authenticated" };
  }

  const db = supabaseAdmin();
  const passwordHash = await hashPassword(data.password);

  const { error } = await db
    .from("users")
    .update({ password_hash: passwordHash })
    .eq("id", session.id);

  if (error) {
    return { error: error.message };
  }

  const redirectTo = getHomePathForRole(session.role);
  return { success: true, redirectTo };
}

export async function updateEmail(data: { email: string }) {
  const session = await getCurrentSession();
  if (!session) {
    return { error: "Not authenticated" };
  }

  const db = supabaseAdmin();

  const { data: existing } = await db
    .from("users")
    .select("id")
    .eq("email", data.email)
    .single();

  if (existing) {
    return { error: "Email already in use" };
  }

  const { error } = await db
    .from("users")
    .update({ email: data.email })
    .eq("id", session.id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function confirmEmail(token: string) {
  const result = await verifyConfirmToken(token);
  if (!result) {
    return { error: "Invalid or expired confirmation link" };
  }

  const db = supabaseAdmin();

  const { data: user } = await db
    .from("users")
    .select("email, name")
    .eq("id", result.userId)
    .single();

  await db
    .from("users")
    .update({ email_confirmed_at: new Date().toISOString() })
    .eq("id", result.userId);

  if (user) {
    await sendEmailConfirmedEmail(user.email, user.name);
  }

  return { success: true };
}

export async function resetPassword(token: string, password: string) {
  const result = await verifyResetToken(token);
  if (!result) {
    return { error: "Invalid or expired reset link" };
  }

  const db = supabaseAdmin();
  const passwordHash = await hashPassword(password);

  await db
    .from("users")
    .update({ password_hash: passwordHash })
    .eq("id", result.userId);

  await deleteResetToken(token);

  return { success: true, redirectTo: "/login" };
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  if (!session) return null;

  const db = supabaseAdmin();
  const { data } = await db
    .from("users")
    .select("id, email, name, created_at")
    .eq("id", session.id)
    .single();

  return data;
}
