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
   if (target.is_main_admin) {
     return { error: "Cannot change the main admin role" };
   }
   return userService.setUserRole(userId, role);
 }

export async function banUserAction(userId: string) {
   const session = await requireRole(["admin"]);
   if (userId === session.id) return { error: "You cannot ban yourself" };
   const target = (await userService.listUsers()).find((u) => u.id === userId);
   if (target?.is_main_admin) {
     return { error: "Cannot ban the main admin" };
   }
   return userService.banUser(userId);
 }

export async function unbanUserAction(userId: string) {
  await requireRole(["admin"]);
  return userService.unbanUser(userId);
}

export async function deleteUserAction(userId: string) {
   const session = await requireRole(["admin"]);
   if (userId === session.id) return { error: "You cannot delete yourself" };
   const target = (await userService.listUsers()).find((u) => u.id === userId);
   if (target?.is_main_admin) {
     return { error: "Cannot delete the main admin" };
   }
   return userService.deleteUser(userId);
 }
