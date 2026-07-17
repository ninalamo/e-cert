"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ORG_ID } from "@/lib/org";
import { DEFAULT_ROLE } from "@/lib/permissions";
import type { LoginInput, RegisterInput } from "../schemas/auth.schema";

export async function login(data: LoginInput) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
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

  redirect("/dashboard");
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

  return { success: true };
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
