import { test, expect } from "@playwright/test";

test.describe("Auth flow", () => {
  test("unauthenticated protected route redirects to SSO", async ({ page }) => {
    // Navigate to a protected route
    await page.goto("/dashboard");

    // Should redirect to Auth Platform SSO login
    await expect(page).toHaveURL(/.*auth\.lyceumalabang\.edu\.ph\/sso\/login.*/);
  });

  test("SSO callback establishes session", async ({ page }) => {
    // Simulate SSO redirect back to the app with a payload fragment
    await page.goto("/#payload=mock-encrypted-payload");

    // Mock server returns a JWT at /api/v1/auth/callback
    // App should store token and redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("logout clears session", async ({ page }) => {
    // Set up authenticated state via mock
    await page.goto("/");

    // Click logout
    await page.getByRole("button", { name: /logout/i }).click();

    // Should redirect to landing or SSO
    await expect(page).toHaveURL(/(login|auth\.lyceumalabang)/);
  });
});
