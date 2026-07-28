import { vi } from "vitest";
import { createMockSupabaseClient } from "./helpers/supabase-mock";

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
process.env.SMTP_HOST = "smtp.example.com";
process.env.SMTP_PORT = "587";
process.env.SMTP_USER = "test@example.com";
process.env.SMTP_PASS = "test-password";
process.env.SMTP_FROM = "test@example.com";
process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";

const mockSupabase = createMockSupabaseClient();

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: mockSupabase,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: mockSupabase,
  createClient: vi.fn(() => mockSupabase),
  createServerClient: vi.fn(() => mockSupabase),
}));

vi.mock("@/lib/seed", () => ({
  ORG_ID: "d4444444-4444-4444-4444-444444444444",
  SEED_PASSWORD: "password123",
  SEED_USERS: [
    { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1", email: "admin@lyceumalabang.edu.ph", name: "Admin User", role: "admin" },
    { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2", email: "staff@lyceumalabang.edu.ph", name: "Staff User", role: "staff" },
    { id: "cccccccc-cccc-cccc-cccc-ccccccccccc3", email: "participant@lyceumalabang.edu.ph", name: "Participant User", role: "participant" },
  ],
  reseed: vi.fn(),
  recreateAdmin: vi.fn(),
  seedUsers: vi.fn(),
  deleteSeededUsers: vi.fn(),
}));

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

vi.mock("@/lib/auth", () => ({
  hashPassword: vi.fn((pw: string) => Promise.resolve(`hashed_${pw}`)),
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

vi.mock("@/lib/email/auth-emails", () => ({
  sendConfirmationEmail: vi.fn(() => Promise.resolve()),
  sendPasswordResetEmail: vi.fn(() => Promise.resolve()),
  sendWelcomeEmail: vi.fn(() => Promise.resolve()),
  sendEmailConfirmedEmail: vi.fn(() => Promise.resolve()),
}));

vi.mock("workflow/api", () => ({
  start: vi.fn(() => Promise.resolve({ runId: "mock-run-id" })),
  getRun: vi.fn(() => ({
    exists: Promise.resolve(true),
    status: Promise.resolve("completed"),
    returnValue: Promise.resolve({ issued: 5, failed: 0 }),
  })),
}));

export function getMockSupabase() {
  return mockSupabase;
}
