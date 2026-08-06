import { test, expect } from "@playwright/test";
import { test as authTest } from "../../fixtures/auth";

test.describe("Auth flow - Unauthenticated", () => {
  test("unauthenticated protected route redirects to SSO", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*auth\.lyceumalabang\.edu\.ph\/sso\/login.*/);
  });
});

test.describe("Auth flow - SSO callback", () => {
  test("SSO callback establishes session", async ({ page }) => {
    await page.goto("/#payload=mock-encrypted-payload");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("SSO callback failure shows error", async ({ page }) => {
    await page.goto("/#payload=invalid");
    await expect(page).toHaveURL(/(login|auth\.lyceumalabang)/);
  });
});

authTest.describe("Auth flow - Authenticated", () => {
  authTest("logout clears session", async ({ adminPage }) => {
    await adminPage.getByRole("button", { name: /logout/i }).click();
    await expect(adminPage).toHaveURL(/(login|auth\.lyceumalabang)/);
  });
});
