# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\tests\auth\auth-flow.spec.ts >> Auth flow - Authenticated >> logout clears session
- Location: e2e\tests\auth\auth-flow.spec.ts:24:11

# Error details

```
Error: apiRequestContext.post: connect ECONNREFUSED ::1:3001
Call log:
  - → POST http://localhost:3001/api/v1/auth/tokens
    - user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.7922.34 Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br
    - content-type: application/json
    - content-length: 45

```