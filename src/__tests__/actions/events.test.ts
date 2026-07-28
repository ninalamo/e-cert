import { describe, it, expect, vi, beforeEach } from "vitest";
import * as eventService from "@/features/events/server/event.service";
import * as certService from "@/features/certificates/server/certificate.service";
import { requireRole } from "@/lib/permissions";
import type { Event } from "@/types/event";
import type { Certificate } from "@/types/certificate";

vi.mock("@/features/events/server/event.service", () => ({
  getEvents: vi.fn(),
  getEventsPaginated: vi.fn(),
  getEvent: vi.fn(),
  getEventWithStats: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  getTemplateForClone: vi.fn(() => ({ id: "tpl-1", name: "Source Template", html_content: "", css_content: null, type: "certificate" })),
  cloneTemplateForEvent: vi.fn(() => ({ id: "cloned-tpl" })),
  cloneEmailTemplateForEvent: vi.fn(() => ({ id: "cloned-email-tpl" })),
}));

vi.mock("@/features/certificates/server/certificate.service", () => ({
  issueCertificate: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function actions() {
  return import("@/features/events/server/event.actions");
}

describe("getEventsAction", () => {
  it("requires admin/staff", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect((await actions()).getEventsAction("org-1")).rejects.toThrow();
  });

  it("returns events", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "a@t.com", name: "A", role: "admin" });
    vi.mocked(eventService.getEvents).mockResolvedValue([{ id: "evt-1" } as unknown as Event]);
    const result = await (await actions()).getEventsAction("org-1");
    expect(result).toHaveLength(1);
  });
});

describe("getEventsPaginatedAction", () => {
  it("returns paginated events", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "a@t.com", name: "A", role: "admin" });
    vi.mocked(eventService.getEventsPaginated).mockResolvedValue({ data: [], count: 0 });
    const result = await (await actions()).getEventsPaginatedAction("org-1", { search: "", limit: 10, offset: 0 });
    expect(result).toEqual({ data: [], count: 0 });
  });
});

describe("getEventAction", () => {
  it("allows participant access", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "user-1", email: "u@t.com", name: "U", role: "participant" });
    vi.mocked(eventService.getEvent).mockResolvedValue({ id: "evt-1" } as unknown as Event);
    const result = await (await actions()).getEventAction("evt-1");
    expect(result).toMatchObject({ id: "evt-1" });
  });
});

describe("getEventWithStatsAction", () => {
  it("requires admin/staff", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect((await actions()).getEventWithStatsAction("evt-1")).rejects.toThrow();
  });
});

describe("createEventAction", () => {
  it("calls createEvent with data", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "staff-1", email: "s@t.com", name: "S", role: "staff" });
    vi.mocked(eventService.createEvent).mockResolvedValue({ event: { id: "new-evt" } as unknown as Event });
    const data = { organization_id: "org-1", name: "Test Event" };
    const result = await (await actions()).createEventAction(data);
    expect(eventService.createEvent).toHaveBeenCalled();
    expect(result).toMatchObject({ id: "new-evt" });
  });
});

describe("updateEventAction", () => {
  it("calls updateEvent", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "a@t.com", name: "A", role: "admin" });
    vi.mocked(eventService.updateEvent).mockResolvedValue({ event: { id: "evt-1" } as unknown as Event });
    await (await actions()).updateEventAction("evt-1", { name: "Updated" });
    expect(eventService.updateEvent).toHaveBeenCalled();
  });
});

describe("deleteEventAction", () => {
  it("requires admin (not staff)", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect((await actions()).deleteEventAction("evt-1")).rejects.toThrow();
  });
});

describe("cloneTemplateForEventAction", () => {
  it("clones with event name prefix", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "a@t.com", name: "A", role: "admin" });
    await (await actions()).cloneTemplateForEventAction("tpl-1", "evt-1", "Graduation");
    expect(eventService.cloneTemplateForEvent).toHaveBeenCalled();
  });
});

describe("cloneEmailTemplateForEventAction", () => {
  it("clones email template", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "a@t.com", name: "A", role: "admin" });
    await (await actions()).cloneEmailTemplateForEventAction("tpl-1", "evt-1", "Graduation");
    expect(eventService.cloneEmailTemplateForEvent).toHaveBeenCalled();
  });
});

describe("issueEventCertificateAction", () => {
  it("fetches event and issues certificate", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "staff-1", email: "s@t.com", name: "S", role: "staff" });
    vi.mocked(eventService.getEvent).mockResolvedValue({ id: "evt-1", name: "Event", event_date: null, location: null, organizer: null, certificate_title: null, certificate_number_pattern: null } as unknown as Event);
    vi.mocked(certService.issueCertificate).mockResolvedValue({ certificate: { id: "cert-1" } as unknown as Certificate });

    await (await actions()).issueEventCertificateAction({
      event_id: "evt-1", organization_id: "org-1",
      recipient_name: "John", recipient_email: "john@test.com", send_email: false,
    });
    expect(certService.issueCertificate).toHaveBeenCalled();
  });
});

describe("bulkIssueEventCertificatesAction", () => {
  it("issues for each recipient", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "staff-1", email: "s@t.com", name: "S", role: "staff" });
    vi.mocked(eventService.getEvent).mockResolvedValue({ id: "evt-1", name: "Event", event_date: null, location: null, organizer: null, certificate_title: null, certificate_number_pattern: null } as unknown as Event);
    vi.mocked(certService.issueCertificate).mockResolvedValue({ certificate: { id: "cert-1" } as unknown as Certificate });

    const result = await (await actions()).bulkIssueEventCertificatesAction({
      event_id: "evt-1", organization_id: "org-1",
      recipients: [{ name: "A", email: "a@t.com" }, { name: "B", email: "b@t.com" }],
    });
    expect(certService.issueCertificate).toHaveBeenCalledTimes(2);
    expect(result.results).toHaveLength(2);
  });
});
