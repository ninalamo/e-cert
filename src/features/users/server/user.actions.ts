"use server";

import * as userService from "./user.service";
import { requireRole } from "@/lib/permissions";
import type { UserRole } from "@/types/organization";

export async function listUsersAction() {
  await requireRole(["admin"]);
  return userService.listUsers();
}

export async function setUserRoleAction(userId: string, role: UserRole) {
  const session = await requireRole(["admin"]);
  if (userId === session.id) {
    return { error: "You cannot change your own role" };
  }
  const target = (await userService.listUsers()).find((u) => u.id === userId);
  if (!target) return { error: "User not found" };
  return userService.setUserRole(userId, role);
}

export async function banUserAction(userId: string) {
  const session = await requireRole(["admin"]);
  if (userId === session.id) return { error: "You cannot ban yourself" };
  return userService.banUser(userId);
}

export async function unbanUserAction(userId: string) {
  await requireRole(["admin"]);
  return userService.unbanUser(userId);
}

export async function deleteUserAction(userId: string) {
  const session = await requireRole(["admin"]);
  if (userId === session.id) return { error: "You cannot delete yourself" };
  return userService.deleteUser(userId);
}
