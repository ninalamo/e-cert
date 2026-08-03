"use server";

import { cookies } from "next/headers";
import type { UserRole } from "@/types/organization";

const COOKIE_NAME = "impersonate_role";
const VALID_ROLES: UserRole[] = ["admin", "staff", "participant"];

export async function setImpersonateRole(role: UserRole | null) {
  if (process.env.DEMO !== "true") return;

  const store = await cookies();
  if (role === null) {
    store.delete(COOKIE_NAME);
  } else if (VALID_ROLES.includes(role)) {
    store.set(COOKIE_NAME, role, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  }
}

export async function getImpersonateRole(): Promise<UserRole | null> {
  if (process.env.DEMO !== "true") return null;

  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (value && VALID_ROLES.includes(value as UserRole)) {
    return value as UserRole;
  }
  return null;
}

export async function isDemoMode(): Promise<boolean> {
  return process.env.DEMO === "true";
}
