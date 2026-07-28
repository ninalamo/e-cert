import { describe, it, expect, vi, beforeEach } from "vitest";
import * as userService from "@/features/users/server/user.service";
import { requireRole } from "@/lib/permissions";
import type { ManagedUser } from "@/features/users/server/user.service";

vi.mock("@/features/users/server/user.service", () => ({
  listUsers: vi.fn(),
  setUserRole: vi.fn(),
  banUser: vi.fn(),
  unbanUser: vi.fn(),
  deleteUser: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function actions() {
  return import("@/features/users/server/user.actions");
}

describe("listUsersAction", () => {
  it("requires admin", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect((await actions()).listUsersAction()).rejects.toThrow();
  });

  it("lists users", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "a@t.com", name: "A", role: "admin" });
    vi.mocked(userService.listUsers).mockResolvedValue([{ id: "user-1" } as unknown as ManagedUser]);
    const result = await (await actions()).listUsersAction();
    expect(result).toHaveLength(1);
  });
});

describe("setUserRoleAction", () => {
  it("prevents changing own role", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "user-1", email: "admin@t.com", name: "Admin", role: "admin" });
    vi.mocked(userService.listUsers).mockResolvedValue([{ id: "user-1", email: "admin@t.com" } as unknown as ManagedUser]);

    const result = await (await actions()).setUserRoleAction("user-1", "staff");
    expect(result).toEqual({ error: "You cannot change your own role" });
    expect(userService.setUserRole).not.toHaveBeenCalled();
  });

  it("sets role for other user", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "a@t.com", name: "A", role: "admin" });
    vi.mocked(userService.listUsers).mockResolvedValue([{ id: "user-2", email: "other@t.com" } as unknown as ManagedUser]);
    vi.mocked(userService.setUserRole).mockResolvedValue({});

    await (await actions()).setUserRoleAction("user-2", "staff");
    expect(userService.setUserRole).toHaveBeenCalledWith("user-2", "staff");
  });
});

describe("banUserAction", () => {
  it("prevents self-ban", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "user-1", email: "a@t.com", name: "A", role: "admin" });
    const result = await (await actions()).banUserAction("user-1");
    expect(result).toEqual({ error: "You cannot ban yourself" });
  });

  it("bans another user", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "a@t.com", name: "A", role: "admin" });
    vi.mocked(userService.banUser).mockResolvedValue({});
    await (await actions()).banUserAction("user-2");
    expect(userService.banUser).toHaveBeenCalledWith("user-2");
  });
});

describe("unbanUserAction", () => {
  it("unbans a user", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "a@t.com", name: "A", role: "admin" });
    vi.mocked(userService.unbanUser).mockResolvedValue({});
    await (await actions()).unbanUserAction("user-2");
    expect(userService.unbanUser).toHaveBeenCalledWith("user-2");
  });
});

describe("deleteUserAction", () => {
  it("prevents self-deletion", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "user-1", email: "a@t.com", name: "A", role: "admin" });
    const result = await (await actions()).deleteUserAction("user-1");
    expect(result).toEqual({ error: "You cannot delete yourself" });
  });

  it("deletes another user", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "a@t.com", name: "A", role: "admin" });
    vi.mocked(userService.deleteUser).mockResolvedValue({ success: true });
    await (await actions()).deleteUserAction("user-2");
    expect(userService.deleteUser).toHaveBeenCalledWith("user-2");
  });
});
