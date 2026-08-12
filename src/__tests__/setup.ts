import { vi } from "vitest";

process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";

vi.mock("@/lib/permissions", () => ({
  getCurrentSession: vi.fn(),
  requireRole: vi.fn(),
  requireSession: vi.fn(),
  DEFAULT_ROLE: "participant",
  canManageCertificates: vi.fn(() => false),
  canManageEvents: vi.fn(() => false),
  canManageTemplates: vi.fn(() => false),
  canDelete: vi.fn(() => false),
  canViewAuditTrail: vi.fn(() => false),
  canManageMembers: vi.fn(() => false),
  canManageUsers: vi.fn(() => false),
  canViewAllCertificates: vi.fn(() => false),
  getHomePathForRole: vi.fn((role: string) => role === "participant" ? "/my" : "/dashboard"),
}));

vi.mock("@/lib/qr", () => ({
  generateQrCode: vi.fn(() => Promise.resolve(Buffer.from("fake-qr-buffer"))),
  generateQrCodeDataUrl: vi.fn(() => Promise.resolve("data:image/png;base64,fakeqr")),
}));

vi.mock("@/lib/pdf", () => ({
  renderHtmlToPdf: vi.fn(() => Promise.resolve(Buffer.from("%PDF-fake-pdf-buffer"))),
  closeBrowser: vi.fn(),
}));

vi.mock("@/lib/template-renderer", () => ({
  renderTemplate: vi.fn(() => "<html><body>Fake Certificate</body></html>"),
}));

vi.mock("@/lib/certificate-renderer", () => ({
  extractCanvasDimensions: vi.fn(() => ({ width: 1123, height: 794 })),
  buildQrReplacement: vi.fn((url: string) => `<img src="${url}" />`),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT:${url}`) }),
}));

vi.mock("@//lib/auth", () => ({
  getAccessToken: vi.fn(() => sessionStorage.getItem("access_token")),
  setAccessToken: vi.fn(() => sessionStorage.setItem("access_token", "")),
  clearAccessToken: vi.fn(() => sessionStorage.removeItem("access_token")),
  parseAccessToken: vi.fn((token: string) => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload;
    } catch {
      return null;
    }
  }),
  hashPassword: vi.fn(() => Promise.resolve("hashed_pw")),
  comparePassword: vi.fn((pw: string, hash: string) => Promise.resolve(pw === hash.replace("hashed_", ""))),
  setSession: vi.fn(() => Promise.resolve()),
  clearSession: vi.fn(() => Promise.resolve()),
  createRefreshToken: vi.fn(() => Promise.resolve("refresh-token")),
  deleteAllRefreshTokens: vi.fn(() => Promise.resolve()),
  createResetToken: vi.fn(() => Promise.resolve("reset-token")),
  verifyResetToken: vi.fn(() => Promise.resolve({ userId: "user-1" })),
  deleteResetToken: vi.fn(() => Promise.resolve()),
  createConfirmToken: vi.fn(() => Promise.resolve("confirm-token")),
  verifyConfirmToken: vi.fn(() => Promise.resolve({ userId: "user-1" })),
}));

vi.mock("@/lib/org", () => ({
  ORG_NAME: "Lyceum Alabang",
}));

vi.mock("./components/whats-new", () => ({
  WhatsNew: () => null,
}));