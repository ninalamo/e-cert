import { describe, it, expect, vi, beforeEach } from "vitest";
import * as attendeeService from "@/features/events/server/attendee.service";
import { requireRole } from "@/lib/permissions";
import type { EventAttendee } from "@/types/event-attendee";

vi.mock("@/features/events/server/attendee.service", () => ({
  getAttendees: vi.fn(),
  addAttendee: vi.fn(),
  updateAttendee: vi.fn(),
  removeAttendee: vi.fn(),
  bulkAddAttendees: vi.fn(),
  issueCertificatesForCompleted: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function actions() {
  return import("@/features/events/server/attendee.actions");
}

describe("getAttendeesAction", () => {
  it("has no auth guard", async () => {
    vi.mocked(attendeeService.getAttendees).mockResolvedValue([{ id: "att-1" } as unknown as EventAttendee]);
    const result = await (await actions()).getAttendeesAction("evt-1");
    expect(result).toHaveLength(1);
    expect(requireRole).not.toHaveBeenCalled();
  });
});

describe("addAttendeeAction", () => {
  it("requires admin/staff", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(
      (await actions()).addAttendeeAction({ event_id: "evt-1", organization_id: "org-1", name: "A", email: "a@t.com" })
    ).rejects.toThrow();
  });

  it("adds attendee", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "a@t.com", name: "A", role: "admin" });
    vi.mocked(attendeeService.addAttendee).mockResolvedValue({ attendee: { id: "att-1" } as unknown as EventAttendee });
    await (await actions()).addAttendeeAction({ event_id: "evt-1", organization_id: "org-1", name: "A", email: "a@t.com" });
    expect(attendeeService.addAttendee).toHaveBeenCalled();
  });
});

describe("updateAttendeeAction", () => {
  it("updates attendee fields", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "a@t.com", name: "A", role: "admin" });
    vi.mocked(attendeeService.updateAttendee).mockResolvedValue({ attendee: { id: "att-1" } as unknown as EventAttendee });
    await (await actions()).updateAttendeeAction("att-1", { name: "Updated", completed: true });
    expect(attendeeService.updateAttendee).toHaveBeenCalledWith("att-1", { name: "Updated", completed: true });
  });
});

describe("removeAttendeeAction", () => {
  it("requires admin/staff", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect((await actions()).removeAttendeeAction("att-1")).rejects.toThrow();
  });
});

describe("bulkAddAttendeesAction", () => {
  it("bulk adds attendees", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "a@t.com", name: "A", role: "admin" });
    vi.mocked(attendeeService.bulkAddAttendees).mockResolvedValue({ added: 1, skipped: 0, errors: [] });
    await (await actions()).bulkAddAttendeesAction({
      event_id: "evt-1", organization_id: "org-1",
      attendees: [{ name: "A", email: "a@t.com" }],
    });
    expect(attendeeService.bulkAddAttendees).toHaveBeenCalled();
  });
});

describe("issueCertificatesForCompletedAction", () => {
  it("issues certs for completed attendees", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "a@t.com", name: "A", role: "admin" });
    vi.mocked(attendeeService.issueCertificatesForCompleted).mockResolvedValue({ issued: 5, failed: 0 });
    const result = await (await actions()).issueCertificatesForCompletedAction("evt-1", { send_email: true });
    expect(attendeeService.issueCertificatesForCompleted).toHaveBeenCalled();
    expect(result).toEqual({ issued: 5, failed: 0 });
  });
});
