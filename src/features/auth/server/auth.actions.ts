"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ORG_ID } from "@/lib/org";
import { DEFAULT_ROLE, getHomePathForRole, getCurrentSession } from "@/lib/permissions";
import { loginSchema, type RegisterInput } from "../schemas/auth.schema";

export async function loginAction(
  _prev: { error?: string; success?: boolean; redirectTo?: string } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: boolean; redirectTo?: string }> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();

  const { data: result, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  if (!result.session) {
    return { error: "Unable to establish session" };
  }

  const session = await getCurrentSession();
  const redirectTo = session ? getHomePathForRole(session.role) : "/dashboard";

  return { success: true, redirectTo };
}

export async function register(data: RegisterInput) {
  const supabase = await createClient();

  const { data: result, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        name: data.name,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (result.user) {
    await supabaseAdmin.from("user_memberships").insert({
      user_id: result.user.id,
      organization_id: ORG_ID,
      role: DEFAULT_ROLE,
    });
  }

  redirect(getHomePathForRole(DEFAULT_ROLE));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPassword(data: { email: string }) {
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/update-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function updatePassword(data: { password: string }) {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: data.password,
  });

  if (error) {
    return { error: error.message };
  }

  const session = await getCurrentSession();
  const redirectTo = session ? getHomePathForRole(session.role) : "/login";

  return { success: true, redirectTo };
}

export async function updateEmail(data: { email: string }) {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    email: data.email,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
