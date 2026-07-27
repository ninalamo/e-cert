import { describe, it, expect, vi, beforeEach } from "vitest";
import * as dashboardService from "@/features/dashboard/server/dashboard.service";
import { requireSession } from "@/lib/permissions";

vi.mock("@/features/dashboard/server/dashboard.service", () => ({
  getDashboardStats: vi.fn(),
  getRecentActivity: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function actions() {
  return import("@/features/dashboard/server/dashboard.actions");
}

describe("getDashboardStatsAction", () => {
  it("requires any authenticated session", async () => {
    vi.mocked(requireSession).mockRejectedValue(new Error("NEXT_REDIRECT:/login"));
    await expect((await actions()).getDashboardStatsAction("org-1")).rejects.toThrow();
  });

  it("returns dashboard stats", async () => {
    vi.mocked(requireSession).mockResolvedValue({ id: "user-1", email: "u@t.com", name: "U", role: "participant" });
    vi.mocked(dashboardService.getDashboardStats).mockResolvedValue({ total_certificates: 100, total_events: 5 });
    const result = await (await actions()).getDashboardStatsAction("org-1");
    expect(dashboardService.getDashboardStats).toHaveBeenCalledWith("org-1");
    expect(result).toEqual({ total_certificates: 100, total_events: 5 });
  });
});

describe("getRecentActivityAction", () => {
  it("returns recent activity", async () => {
    vi.mocked(requireSession).mockResolvedValue({ id: "user-1", email: "u@t.com", name: "U", role: "staff" });
    vi.mocked(dashboardService.getRecentActivity).mockResolvedValue([{ id: "act-1" } as never]);
    await (await actions()).getRecentActivityAction("org-1");
    expect(dashboardService.getRecentActivity).toHaveBeenCalledWith("org-1");
  });
});
