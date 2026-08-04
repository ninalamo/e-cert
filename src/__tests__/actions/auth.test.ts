import { describe, it, expect, vi, beforeEach } from "vitest";
import { loginAction, register, logout, forgotPassword, resetPassword, confirmEmail, getCurrentUser, requestPasswordChange, updatePassword, updateEmail } from "@/features/auth/server/auth.actions";
import { mockQueryResult, mockQueryError } from "../helpers";
import { getMockSupabase } from "../setup";
import { getCurrentSession } from "@/lib/permissions";
import { setSession, createConfirmToken, hashPassword, clearSession, createResetToken, verifyResetToken } from "@/lib/auth";
import { sendConfirmationEmail, sendPasswordResetEmail, sendWelcomeEmail, sendEmailConfirmedEmail } from "@/lib/email/auth-emails";

beforeEach(() => {
  getMockSupabase()._resetHandlers();
  vi.clearAllMocks();
});

describe("loginAction", () => {
  function formData(email: string, password: string): FormData {
    const fd = new FormData();
    fd.set("email", email);
    fd.set("password", password);
    return fd;
  }

  it("returns error for invalid email format", async () => {
    const result = await loginAction(undefined, formData("not-an-email", "password123"));
    expect(result.error).toBeDefined();
    expect(result.success).toBeUndefined();
  });

  it("returns error for short password", async () => {
    const result = await loginAction(undefined, formData("test@test.com", "12"));
    expect(result.error).toBeDefined();
  });

  it("returns error when user not found", async () => {
    getMockSupabase()._setHandler("users", mockQueryError("User not found"));

    const result = await loginAction(undefined, formData("unknown@test.com", "password123"));
    expect(result).toEqual({ error: "Invalid email or password" });
  });

  it("returns error when account is banned", async () => {
    const futureBan = new Date(Date.now() + 86400000).toISOString();
    getMockSupabase()._setHandler("users", mockQueryResult({
      id: "user-1", email: "banned@test.com", name: "Banned", password_hash: "hashed_password123",
      banned_until: futureBan, email_confirmed_at: new Date().toISOString(),
    }));

    const result = await loginAction(undefined, formData("banned@test.com", "password123"));
    expect(result).toEqual({ error: "Account is banned" });
  });

  it("returns error when email not confirmed", async () => {
    getMockSupabase()._setHandler("users", mockQueryResult({
      id: "user-1", email: "unconfirmed@test.com", name: "Unconfirmed",
      password_hash: "hashed_password123", banned_until: null, email_confirmed_at: null,
    }));

    const result = await loginAction(undefined, formData("unconfirmed@test.com", "password123"));
    expect(result).toEqual({ error: "Please confirm your email before logging in." });
  });

  it("returns error when password is wrong", async () => {
    getMockSupabase()._setHandler("users", mockQueryResult({
      id: "user-1", email: "user@test.com", name: "User",
      password_hash: "hashed_correctpassword", banned_until: null,
      email_confirmed_at: new Date().toISOString(),
    }));

    const result = await loginAction(undefined, formData("user@test.com", "wrongpassword"));
    expect(result).toEqual({ error: "Invalid email or password" });
  });

  it("returns success and sets session when credentials are valid", async () => {
    getMockSupabase()._setHandler("users", mockQueryResult({
      id: "user-1", email: "user@test.com", name: "User",
      password_hash: "hashed_password123", banned_until: null,
      email_confirmed_at: new Date().toISOString(),
    }));
    getMockSupabase()._setHandler("user_memberships", mockQueryResult({
      user_id: "user-1", role: "participant",
    }));

    const result = await loginAction(undefined, formData("user@test.com", "password123"));
    expect(result).toEqual({ success: true, redirectTo: "/my" });
    expect(setSession).toHaveBeenCalledWith({ sub: "user-1", email: "user@test.com", name: "User" });
  });

  it("redirects admin to /dashboard", async () => {
    getMockSupabase()._setHandler("users", mockQueryResult({
      id: "user-1", email: "admin@test.com", name: "Admin",
      password_hash: "hashed_password123", banned_until: null,
      email_confirmed_at: new Date().toISOString(),
    }));
    getMockSupabase()._setHandler("user_memberships", mockQueryResult({
      user_id: "user-1", role: "admin",
    }));

    const result = await loginAction(undefined, formData("admin@test.com", "password123"));
    expect(result).toEqual({ success: true, redirectTo: "/dashboard" });
  });
});

describe("register", () => {
  it("returns error when email already exists", async () => {
    getMockSupabase()._setHandler("users", mockQueryResult({ id: "existing-id" }));

    const result = await register({ name: "New", email: "existing@test.com", password: "Password123!", confirmPassword: "Password123!" });
    expect(result).toEqual({ error: "Email already registered" });
  });

  it("creates user and membership, sends confirmation email", async () => {
    getMockSupabase()._setHandler("users", [
      mockQueryResult(null),
      mockQueryResult({ id: "new-user-id" }),
    ]);
    getMockSupabase()._setHandler("user_memberships", mockQueryResult({}));

    const result = await register({ name: "New User", email: "new@test.com", password: "Password123!", confirmPassword: "Password123!" });
    expect(result).toEqual({ success: true });
    expect(hashPassword).toHaveBeenCalledWith("Password123!");
    expect(createConfirmToken).toHaveBeenCalled();
    expect(sendConfirmationEmail).toHaveBeenCalledWith("new@test.com", "confirm-token");
  });

  it("returns error when user insert fails", async () => {
    getMockSupabase()._setHandler("users", mockQueryError("Not found"));

    const result = await register({ name: "Fail", email: "fail@test.com", password: "Password123!", confirmPassword: "Password123!" });
    expect(result).toHaveProperty("error");
  });
});

describe("logout", () => {
  it("clears session and redirects to /login", async () => {
    try {
      await logout();
    } catch (e) {
      expect((e as Error).message).toBe("NEXT_REDIRECT:/login");
    }
    expect(clearSession).toHaveBeenCalledOnce();
  });
});

describe("forgotPassword", () => {
  it("returns success even when email not found (to prevent enumeration)", async () => {
    getMockSupabase()._setHandler("users", mockQueryError("Not found"));

    const result = await forgotPassword({ email: "nonexistent@test.com" });
    expect(result).toEqual({ success: true });
  });

  it("creates reset token and sends email when user exists", async () => {
    getMockSupabase()._setHandler("users", mockQueryResult({ id: "user-1" }));

    const result = await forgotPassword({ email: "user@test.com" });
    expect(result).toEqual({ success: true });
    expect(createResetToken).toHaveBeenCalledWith("user-1");
    expect(sendPasswordResetEmail).toHaveBeenCalledWith("user@test.com", "reset-token");
  });
});

describe("resetPassword", () => {
  it("returns error for invalid token", async () => {
    vi.mocked(verifyResetToken).mockResolvedValueOnce(null);

    const result = await resetPassword("invalid-token", "newpassword123");
    expect(result).toEqual({ error: "Invalid or expired reset link" });
  });

  it("updates password and deletes token", async () => {
    vi.mocked(verifyResetToken).mockResolvedValueOnce({ userId: "user-1" });

    const result = await resetPassword("valid-token", "newpassword123");
    expect(result).toEqual({ success: true, redirectTo: "/login" });
    expect(hashPassword).toHaveBeenCalledWith("newpassword123");
    const { deleteResetToken } = await import("@/lib/auth");
    expect(deleteResetToken).toHaveBeenCalledWith("valid-token");
  });
});

describe("confirmEmail", () => {
  it("returns error for invalid token", async () => {
    const { verifyConfirmToken } = await import("@/lib/auth");
    vi.mocked(verifyConfirmToken).mockResolvedValueOnce(null);

    const result = await confirmEmail("invalid-token");
    expect(result).toEqual({ error: "Invalid or expired confirmation link" });
  });

  it("confirms email and sends welcome emails", async () => {
    getMockSupabase()._setHandler("users", mockQueryResult({ email: "user@test.com", name: "User" }));

    const result = await confirmEmail("valid-token");
    expect(result).toEqual({ success: true });
    expect(sendEmailConfirmedEmail).toHaveBeenCalledWith("user@test.com", "User");
    expect(sendWelcomeEmail).toHaveBeenCalledWith("user@test.com", "User");
  });
});

describe("getCurrentUser", () => {
  it("returns null when not authenticated", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(null);

    const result = await getCurrentUser();
    expect(result).toBeNull();
  });

  it("returns user data when authenticated", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: "user-1", email: "user@test.com", name: "User", role: "participant",
    });
    getMockSupabase()._setHandler("users", mockQueryResult({
      id: "user-1", email: "user@test.com", name: "User", created_at: "2024-01-01",
    }));

    const result = await getCurrentUser();
    expect(result).toMatchObject({ id: "user-1", email: "user@test.com", name: "User" });
  });
});

describe("requestPasswordChange", () => {
  it("returns error when not authenticated", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(null);

    const result = await requestPasswordChange();
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("sends password reset email when authenticated", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: "user-1", email: "user@test.com", name: "User", role: "participant",
    });

    const result = await requestPasswordChange();
    expect(result).toEqual({ success: true });
    expect(sendPasswordResetEmail).toHaveBeenCalledWith("user@test.com", "reset-token");
  });
});

describe("updatePassword", () => {
  it("returns error when not authenticated", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(null);

    const result = await updatePassword({ password: "newpass123" });
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("updates password when authenticated", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: "user-1", email: "user@test.com", name: "User", role: "participant",
    });

    const result = await updatePassword({ password: "newpass123" });
    expect(result).toEqual({ success: true, redirectTo: "/my" });
    expect(hashPassword).toHaveBeenCalledWith("newpass123");
  });
});

describe("updateEmail", () => {
  it("returns error when not authenticated", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue(null);

    const result = await updateEmail({ email: "new@test.com" });
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("returns error when email already in use", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: "user-1", email: "old@test.com", name: "User", role: "participant",
    });
    getMockSupabase()._setHandler("users", mockQueryResult({ id: "other" }));

    const result = await updateEmail({ email: "taken@test.com" });
    expect(result).toEqual({ error: "Email already in use" });
  });

  it("updates email when available", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: "user-1", email: "old@test.com", name: "User", role: "participant",
    });
    getMockSupabase()._setHandler("users", [
      mockQueryError("Not found"),
      mockQueryResult(null),
    ]);

    const result = await updateEmail({ email: "new@test.com" });
    expect(result).toEqual({ success: true });
  });
});
