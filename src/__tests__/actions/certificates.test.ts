import { describe, it, expect, vi, beforeEach } from "vitest";
import * as certService from "@/features/certificates/server/certificate.service";
import * as emailService from "@/features/certificates/server/certificate-email.service";
import { requireRole, requireSession } from "@/lib/permissions";
import type { Certificate } from "@/types/certificate";
import type { CertificateEmailLog } from "@/types/certificate-email";

vi.mock("@/features/certificates/server/certificate.service", () => ({
  issueCertificate: vi.fn(),
  getCertificates: vi.fn(),
  getCertificatesWithEvent: vi.fn(),
  getCertificate: vi.fn(),
  getMyCertificate: vi.fn(),
  getMyCertificatesWithEvent: vi.fn(),
  revokeCertificate: vi.fn(),
  deleteCertificate: vi.fn(),
}));

vi.mock("@/features/certificates/server/certificate-email.service", () => ({
  sendCertificateEmail: vi.fn(),
  getEmailLogs: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({
  getStorageProvider: vi.fn(() => ({
    writeFile: vi.fn(() => Promise.resolve()),
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("issueCertificateAction", () => {
  const data = {
    organization_id: "org-1",
    recipient_name: "John Doe",
    recipient_email: "john@example.com",
  };

  it("returns 403 when not admin/staff", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("NEXT_REDIRECT:/dashboard"));

    await expect(
      import("@/features/certificates/server/certificate.actions").then(m => m.issueCertificateAction(data))
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard");
  });

  it("calls issueCertificate with admin role", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "admin@test.com", name: "Admin", role: "admin" });
    vi.mocked(certService.issueCertificate).mockResolvedValue({ certificate: { id: "cert-1" } as unknown as Certificate });

    const actions = await import("@/features/certificates/server/certificate.actions");
    const result = await actions.issueCertificateAction(data);
    expect(result).toEqual({ certificate: { id: "cert-1" } });
    expect(certService.issueCertificate).toHaveBeenCalledWith({
      ...data,
      send_email: false,
      user_id: "admin-1",
    });
  });

  it("calls issueCertificate with staff role", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "staff-1", email: "staff@test.com", name: "Staff", role: "staff" });
    vi.mocked(certService.issueCertificate).mockResolvedValue({ certificate: { id: "cert-2" } as unknown as Certificate });

    const actions = await import("@/features/certificates/server/certificate.actions");
    await actions.issueCertificateAction({ ...data, send_email: true });
    expect(certService.issueCertificate).toHaveBeenCalledWith({
      ...data,
      send_email: true,
      user_id: "staff-1",
    });
  });
});

describe("uploadCertificateFileAction", () => {
  it("requires admin/staff role", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("NEXT_REDIRECT:/dashboard"));

    const actions = await import("@/features/certificates/server/certificate.actions");
    await expect(
      actions.uploadCertificateFileAction("org-1", "CERT-001", "base64data", "cert.pdf")
    ).rejects.toThrow();
  });

  it("writes file to storage", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "admin@test.com", name: "Admin", role: "admin" });
    const { getStorageProvider } = await import("@/lib/storage");

    const actions = await import("@/features/certificates/server/certificate.actions");
    const filePath = await actions.uploadCertificateFileAction("org-1", "CERT-001", "dGVzdA==", "cert.pdf");

    expect(filePath).toBe("certificates/org-1/CERT-001.pdf");
    expect(getStorageProvider).toHaveBeenCalled();
  });
});

describe("getCertificatesAction", () => {
  it("requires admin/staff role", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("NEXT_REDIRECT:/dashboard"));

    const actions = await import("@/features/certificates/server/certificate.actions");
    await expect(actions.getCertificatesAction("org-1")).rejects.toThrow();
  });

  it("returns certificates list", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "admin@test.com", name: "Admin", role: "admin" });
    vi.mocked(certService.getCertificates).mockResolvedValue([{ id: "cert-1" } as unknown as Certificate]);

    const actions = await import("@/features/certificates/server/certificate.actions");
    const result = await actions.getCertificatesAction("org-1");
    expect(result).toHaveLength(1);
    expect(certService.getCertificates).toHaveBeenCalledWith("org-1");
  });
});

describe("getCertificatesWithEventAction", () => {
  it("passes through to service", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "admin@test.com", name: "Admin", role: "admin" });
    vi.mocked(certService.getCertificatesWithEvent).mockResolvedValue({ data: [], count: 0 });

    const actions = await import("@/features/certificates/server/certificate.actions");
    const result = await actions.getCertificatesWithEventAction("org-1");
    expect(result).toEqual({ data: [], count: 0 });
  });
});

describe("getCertificateAction", () => {
  it("admin can get any certificate", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "admin@test.com", name: "Admin", role: "admin" });
    vi.mocked(certService.getCertificate).mockResolvedValue({ id: "cert-1" } as unknown as Certificate);

    const actions = await import("@/features/certificates/server/certificate.actions");
    await actions.getCertificateAction("cert-1");
    expect(certService.getCertificate).toHaveBeenCalledWith("cert-1");
    expect(certService.getMyCertificate).not.toHaveBeenCalled();
  });

  it("participant can only get own certificate", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "user-1", email: "user@test.com", name: "User", role: "participant" });
    vi.mocked(certService.getMyCertificate).mockResolvedValue({ id: "cert-1" } as unknown as Certificate);

    const actions = await import("@/features/certificates/server/certificate.actions");
    await actions.getCertificateAction("cert-1");
    expect(certService.getMyCertificate).toHaveBeenCalledWith("cert-1", "user@test.com");
  });
});

describe("revokeCertificateAction", () => {
  it("requires admin role", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("NEXT_REDIRECT:/dashboard"));

    const actions = await import("@/features/certificates/server/certificate.actions");
    await expect(actions.revokeCertificateAction("cert-1", "reason")).rejects.toThrow();
  });

  it("calls service revoke", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "admin@test.com", name: "Admin", role: "admin" });
    vi.mocked(certService.revokeCertificate).mockResolvedValue({ certificate: { id: "cert-1" } as unknown as Certificate });

    const actions = await import("@/features/certificates/server/certificate.actions");
    await actions.revokeCertificateAction("cert-1", "test reason");
    expect(certService.revokeCertificate).toHaveBeenCalledWith("cert-1", "test reason", "admin-1");
  });
});

describe("deleteCertificateAction", () => {
  it("requires admin role", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("NEXT_REDIRECT:/dashboard"));

    const actions = await import("@/features/certificates/server/certificate.actions");
    await expect(actions.deleteCertificateAction("cert-1")).rejects.toThrow();
  });

  it("calls service delete", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "admin@test.com", name: "Admin", role: "admin" });
    vi.mocked(certService.deleteCertificate).mockResolvedValue({ certificate: { id: "cert-1" } as unknown as Certificate });

    const actions = await import("@/features/certificates/server/certificate.actions");
    await actions.deleteCertificateAction("cert-1");
    expect(certService.deleteCertificate).toHaveBeenCalledWith("cert-1", "admin-1");
  });
});

describe("sendCertificateEmailAction", () => {
  it("requires admin/staff", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("NEXT_REDIRECT:/dashboard"));

    const actions = await import("@/features/certificates/server/certificate.actions");
    await expect(actions.sendCertificateEmailAction("cert-1")).rejects.toThrow();
  });

  it("calls email service", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "staff-1", email: "staff@test.com", name: "Staff", role: "staff" });
    vi.mocked(emailService.sendCertificateEmail).mockResolvedValue({ success: true });

    const actions = await import("@/features/certificates/server/certificate.actions");
    await actions.sendCertificateEmailAction("cert-1");
    expect(emailService.sendCertificateEmail).toHaveBeenCalledWith("cert-1", "staff-1");
  });
});

describe("getEmailLogsAction", () => {
  it("calls email service", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "admin-1", email: "admin@test.com", name: "Admin", role: "admin" });
    vi.mocked(emailService.getEmailLogs).mockResolvedValue([{ id: "log-1" } as unknown as CertificateEmailLog]);

    const actions = await import("@/features/certificates/server/certificate.actions");
    await actions.getEmailLogsAction("cert-1");
    expect(emailService.getEmailLogs).toHaveBeenCalledWith("cert-1");
  });
});

describe("getMyCertificatesAction", () => {
  it("requires session", async () => {
    vi.mocked(requireSession).mockRejectedValue(new Error("NEXT_REDIRECT:/login"));

    const actions = await import("@/features/certificates/server/certificate.actions");
    await expect(actions.getMyCertificatesAction()).rejects.toThrow();
  });

  it("calls getMyCertificatesWithEvent with user email", async () => {
    vi.mocked(requireSession).mockResolvedValue({ id: "user-1", email: "user@test.com", name: "User", role: "participant" });
    vi.mocked(certService.getMyCertificatesWithEvent).mockResolvedValue([]);

    const actions = await import("@/features/certificates/server/certificate.actions");
    await actions.getMyCertificatesAction();
    expect(certService.getMyCertificatesWithEvent).toHaveBeenCalledWith(
      "user@test.com",
      "id, certificate_number, issued_at, expires_at, revoked_at"
    );
  });
});

describe("getMyCertificateAction", () => {
  it("calls getMyCertificate with user email", async () => {
    vi.mocked(requireSession).mockResolvedValue({ id: "user-1", email: "user@test.com", name: "User", role: "participant" });
    vi.mocked(certService.getMyCertificate).mockResolvedValue({ id: "cert-1" } as unknown as Certificate);

    const actions = await import("@/features/certificates/server/certificate.actions");
    await actions.getMyCertificateAction("cert-1");
    expect(certService.getMyCertificate).toHaveBeenCalledWith("cert-1", "user@test.com");
  });
});

describe("getCertificateQrCodeAction", () => {
  it("generates QR data URL", async () => {
    vi.mocked(requireRole).mockResolvedValue({ id: "user-1", email: "user@test.com", name: "User", role: "participant" });
    const { generateQrCodeDataUrl } = await import("@/lib/qr");
    vi.mocked(generateQrCodeDataUrl).mockResolvedValue("data:image/png;base64,qrcode");

    const actions = await import("@/features/certificates/server/certificate.actions");
    const result = await actions.getCertificateQrCodeAction("CERT-001");
    expect(generateQrCodeDataUrl).toHaveBeenCalledWith(
      "http://localhost:3000/verify?number=CERT-001",
      { width: 200, margin: 2 }
    );
    expect(result).toBe("data:image/png;base64,qrcode");
  });
});

describe("getSessionRoleAction", () => {
  it("returns session role", async () => {
    vi.mocked(requireSession).mockResolvedValue({ id: "user-1", email: "user@test.com", name: "User", role: "admin" });

    const actions = await import("@/features/certificates/server/certificate.actions");
    const result = await actions.getSessionRoleAction();
    expect(result).toBe("admin");
  });
});
