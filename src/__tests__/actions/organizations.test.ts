import { describe, it, expect, vi, beforeEach } from "vitest";
import * as orgService from "@/features/organizations/server/organization.service";
import { requireRole } from "@/lib/permissions";

vi.mock("@/features/organizations/server/organization.service", () => ({
  getUserOrganizations: vi.fn(),
  getOrganizationMembers: vi.fn(),
  addMember: vi.fn(),
  removeMember: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function actions() {
  return import("@/features/organizations/server/organization.actions");
}

describe("createOrganizationAction", () => {
  it("returns error in single-org mode", async () => {
    const result = await (await actions()).createOrganizationAction();
    expect(result).toEqual({ error: "Organization management is disabled in single-org mode" });
  });
});

describe("getMyOrganizationsAction", () => {
  it("requires admin/staff", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect((await actions()).getMyOrganizationsAction()).rejects.toThrow();
  });

  it("calls service with session id", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "user-1", email: "u@t.com", name: "U", role: "admin" });
    vi.mocked(orgService.getUserOrganizations).mockResolvedValue([{ id: "org-1" } as never]);
    await (await actions()).getMyOrganizationsAction();
    expect(orgService.getUserOrganizations).toHaveBeenCalledWith("user-1");
  });
});

describe("getOrganizationMembersAction", () => {
  it("calls service", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "a@t.com", name: "A", role: "admin" });
    vi.mocked(orgService.getOrganizationMembers).mockResolvedValue([{ id: "mem-1" } as never]);
    await (await actions()).getOrganizationMembersAction("org-1");
    expect(orgService.getOrganizationMembers).toHaveBeenCalledWith("org-1");
  });
});

describe("addMemberAction", () => {
  it("requires admin", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect((await actions()).addMemberAction("org-1", "new@t.com", "staff")).rejects.toThrow();
  });

  it("adds member", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "a@t.com", name: "A", role: "admin" });
    vi.mocked(orgService.addMember).mockResolvedValue({ id: "mem-1" } as never);
    await (await actions()).addMemberAction("org-1", "new@t.com", "staff");
    expect(orgService.addMember).toHaveBeenCalledWith("org-1", "new@t.com", "staff", undefined);
  });
});

describe("removeMemberAction", () => {
  it("requires admin", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect((await actions()).removeMemberAction("org-1", "mem-1")).rejects.toThrow();
  });

  it("removes member", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "a@t.com", name: "A", role: "admin" });
    await (await actions()).removeMemberAction("org-1", "mem-1");
    expect(orgService.removeMember).toHaveBeenCalledWith("org-1", "mem-1", "admin-1");
  });
});
