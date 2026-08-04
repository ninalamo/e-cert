"use server";

import { cookies } from "next/headers";

const COOKIE_NAME = "impersonate_user";

export async function setImpersonateUser(userId: string | null) {
  if (process.env.DEMO !== "true") return;

  const store = await cookies();
  if (userId === null) {
    store.delete(COOKIE_NAME);
  } else {
    store.set(COOKIE_NAME, userId, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
}

export async function getImpersonateUserId(): Promise<string | null> {
  if (process.env.DEMO !== "true") return null;

  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  return value ?? null;
}

export async function isDemoMode(): Promise<boolean> {
  return process.env.DEMO === "true";
}
