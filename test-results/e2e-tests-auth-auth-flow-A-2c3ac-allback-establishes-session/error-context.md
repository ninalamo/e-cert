# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\tests\auth\auth-flow.spec.ts >> Auth flow - SSO callback >> SSO callback establishes session
- Location: e2e\tests\auth\auth-flow.spec.ts:12:7

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/#payload=mock-encrypted-payload", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { test as authTest } from "../../fixtures/auth";
  3  | 
  4  | test.describe("Auth flow - Unauthenticated", () => {
  5  |   test("unauthenticated protected route redirects to SSO", async ({ page }) => {
  6  |     await page.goto("/dashboard");
  7  |     await expect(page).toHaveURL(/.*auth\.lyceumalabang\.edu\.ph\/sso\/login.*/);
  8  |   });
  9  | });
  10 | 
  11 | test.describe("Auth flow - SSO callback", () => {
  12 |   test("SSO callback establishes session", async ({ page }) => {
> 13 |     await page.goto("/#payload=mock-encrypted-payload");
     |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  14 |     await expect(page).toHaveURL(/\/dashboard/);
  15 |   });
  16 | 
  17 |   test("SSO callback failure shows error", async ({ page }) => {
  18 |     await page.goto("/#payload=invalid");
  19 |     await expect(page).toHaveURL(/(login|auth\.lyceumalabang)/);
  20 |   });
  21 | });
  22 | 
  23 | authTest.describe("Auth flow - Authenticated", () => {
  24 |   authTest("logout clears session", async ({ adminPage }) => {
  25 |     await adminPage.getByRole("button", { name: /logout/i }).click();
  26 |     await expect(adminPage).toHaveURL(/(login|auth\.lyceumalabang)/);
  27 |   });
  28 | });
  29 | 
```