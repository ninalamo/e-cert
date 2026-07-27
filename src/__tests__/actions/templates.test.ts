import { describe, it, expect, vi, beforeEach } from "vitest";
import * as templateService from "@/features/templates/server/template.service";
import { requireRole, getCurrentSession } from "@/lib/permissions";

vi.mock("@/features/templates/server/template.service", () => ({
  getTemplatesWithLockState: vi.fn(),
  getCertificateTemplates: vi.fn(),
  getCertificateTemplatesWithLockState: vi.fn(),
  getEmailTemplates: vi.fn(),
  getEmailTemplatesWithLockState: vi.fn(),
  getAuthTemplates: vi.fn(),
  getTemplate: vi.fn(),
  getEmailTemplate: vi.fn(),
  getAuthTemplateByProcess: vi.fn(),
  isTemplateLocked: vi.fn(() => false),
  isEmailTemplateLocked: vi.fn(() => false),
  createTemplate: vi.fn(),
  createEmailTemplate: vi.fn(),
  createAuthTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function actions() {
  return import("@/features/templates/server/template.actions");
}

describe("getCurrentRoleAction", () => {
  it("returns participant role when not authenticated", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(null);
    const result = await (await actions()).getCurrentRoleAction();
    expect(result).toBe("participant");
  });

  it("returns session role", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({ id: "u1", email: "a@t.com", name: "A", role: "admin" });
    const result = await (await actions()).getCurrentRoleAction();
    expect(result).toBe("admin");
  });
});

describe("list actions", () => {
  const listActions = [
    "getTemplatesAction",
    "getCertificateTemplatesAction",
    "getCertificateTemplatesWithLockStateAction",
    "getEmailTemplatesAction",
    "getEmailTemplatesWithLockStateAction",
    "getAuthTemplatesAction",
  ] as const;

  for (const actionName of listActions) {
    it(`${actionName} requires admin/staff`, async () => {
      vi.mocked(requireRole).mockRejectedValue(new Error("NEXT_REDIRECT"));
      const mod = await actions();
      await expect((mod as Record<string, unknown>)[actionName]("org-1")).rejects.toThrow();
    });
  }
});

describe("createTemplateAction", () => {
  it("creates certificate template", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "a@t.com", name: "A", role: "admin" });
    vi.mocked(templateService.createTemplate).mockResolvedValue({ id: "tpl-1" } as never);
    const data = { organization_id: "org-1", name: "New Cert", html_content: "<div></div>" };
    await (await actions()).createTemplateAction(data);
    expect(templateService.createTemplate).toHaveBeenCalledWith({
      ...data,
      description: null,
      css_content: null,
    });
  });
});

describe("createEmailTemplateAction", () => {
  it("creates email template", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "a@t.com", name: "A", role: "admin" });
    vi.mocked(templateService.createEmailTemplate).mockResolvedValue({ id: "tpl-1" } as never);
    await (await actions()).createEmailTemplateAction({ organization_id: "org-1", name: "New Email", html_content: "<p></p>" });
    expect(templateService.createEmailTemplate).toHaveBeenCalled();
  });
});

describe("createAuthTemplateAction", () => {
  it("creates auth template", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "a@t.com", name: "A", role: "admin" });
    vi.mocked(templateService.createAuthTemplate).mockResolvedValue({ id: "tpl-1" } as never);
    await (await actions()).createAuthTemplateAction({ organization_id: "org-1", name: "Auth Email", html_content: "<p></p>", auth_process: "welcome" as never });
    expect(templateService.createAuthTemplate).toHaveBeenCalled();
  });
});

describe("updateTemplateAction", () => {
  it("returns error when template is locked", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "a@t.com", name: "A", role: "admin" });
    vi.mocked(templateService.isTemplateLocked).mockResolvedValue(true);
    vi.mocked(templateService.getTemplate).mockResolvedValue({ id: "tpl-1", type: "certificate" } as never);

    const result = await (await actions()).updateTemplateAction("tpl-1", { name: "New" });
    expect(result.error).toContain("locked");
    expect(templateService.updateTemplate).not.toHaveBeenCalled();
  });

  it("updates when not locked", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "a@t.com", name: "A", role: "admin" });
    vi.mocked(templateService.isTemplateLocked).mockResolvedValue(false);
    vi.mocked(templateService.getTemplate).mockResolvedValue({ id: "tpl-1", type: "certificate" } as never);
    vi.mocked(templateService.updateTemplate).mockResolvedValue({ id: "tpl-1" } as never);

    await (await actions()).updateTemplateAction("tpl-1", { name: "Updated" });
    expect(templateService.updateTemplate).toHaveBeenCalled();
  });
});

describe("deleteTemplateAction", () => {
  it("requires admin role", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect((await actions()).deleteTemplateAction("tpl-1")).rejects.toThrow();
  });

  it("returns error when locked", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "a@t.com", name: "A", role: "admin" });
    vi.mocked(templateService.isTemplateLocked).mockResolvedValue(true);
    vi.mocked(templateService.getTemplate).mockResolvedValue({ id: "tpl-1", type: "certificate" } as never);

    const result = await (await actions()).deleteTemplateAction("tpl-1");
    expect(result.error).toContain("locked");
  });
});
