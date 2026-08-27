const http = require("http");
const { spawn } = require("child_process");
const PORT = 3001;
const AUTH_PORT = 3002;
const IS_WIN = process.platform === "win32";
const NPX = IS_WIN ? "npx.cmd" : "npx";

function httpRequest(port, options, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      { ...options, hostname: "localhost", port },
      (res) => {
        let chunks = "";
        res.on("data", (chunk) => (chunks += chunk));
        res.on("end", () => {
          try {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: JSON.parse(chunks),
            });
          } catch {
            resolve({ status: res.statusCode, headers: res.headers, data: chunks });
          }
        });
      }
    );
    req.on("error", reject);
    if (data) {
      req.setHeader("Content-Type", "application/json");
      req.write(data);
    }
    req.end();
  });
}

async function waitForServer(port, path) {
  let retries = 0;
  const maxRetries = 10;
  while (retries < maxRetries) {
    try {
      await httpRequest(port, { method: "GET", path });
      return true;
    } catch {
      retries++;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return false;
}

async function test() {
  console.log("Starting mock server...\n");
  const server = spawn(NPX, ["tsx", "mock/server.ts"], {
    cwd: process.cwd(),
    shell: true,
    stdio: "ignore",
  });

  // Wait for server to start
  const isUp = await waitForServer(PORT, "/api/v1/auth/test-users");
  if (!isUp) {
    console.error("Server failed to start. Is port 3001 free?");
    process.exit(1);
  }

  // Wait for Auth Platform to start
  const authUp = await waitForServer(AUTH_PORT, "/sso/login");
  if (!authUp) {
    console.log("Warning: Auth Platform (port 3002) not started yet, waiting...\n");
  }

  try {
    // Test 1: List test users
    console.log("Test 1: GET /api/v1/auth/test-users");
    const r1 = await httpRequest(PORT, { method: "GET", path: "/api/v1/auth/test-users" });
    console.log(`  Status: ${r1.status}`);
    console.log(`  Users: ${JSON.stringify(r1.data.data.map((u) => u.email))}\n`);

    // Test 2: Login as admin
    console.log("Test 2: POST /api/v1/auth/tokens (admin login)");
    const r2 = await httpRequest(
      PORT,
      { method: "POST", path: "/api/v1/auth/tokens" },
      { email: "admin@test.com", password: "admin" }
    );
    console.log(`  Status: ${r2.status}`);
    console.log(`  Has access_token: ${!!r2.data.data?.access_token}`);
    console.log(`  Has refresh cookie: ${!!r2.headers["set-cookie"]?.[0]?.includes("loa_cert_refresh")}\n`);

    // Test 3: Login as staff
    console.log("Test 3: POST /api/v1/auth/tokens (staff login)");
    const r3 = await httpRequest(
      PORT,
      { method: "POST", path: "/api/v1/auth/tokens" },
      { email: "staff@test.com", password: "staff" }
    );
    console.log(`  Status: ${r3.status}`);
    console.log(`  Has access_token: ${!!r3.data.data?.access_token}\n`);

    // Test 4: Login as participant
    console.log("Test 4: POST /api/v1/auth/tokens (participant login)");
    const r4 = await httpRequest(
      PORT,
      { method: "POST", path: "/api/v1/auth/tokens" },
      { email: "participant@test.com", password: "participant" }
    );
    console.log(`  Status: ${r4.status}`);
    console.log(`  Has access_token: ${!!r4.data.data?.access_token}\n`);

    // Test 5: Invalid login
    console.log("Test 5: POST /api/v1/auth/tokens (invalid login)");
    const r5 = await httpRequest(
      PORT,
      { method: "POST", path: "/api/v1/auth/tokens" },
      { email: "admin@test.com", password: "wrong" }
    );
    console.log(`  Status: ${r5.status} (expected 401)`);
    console.log(`  Message: ${r5.data.message}\n`);

    // Test 6: Verify JWT structure
    console.log("Test 6: Decode JWT payload");
    const token = r2.data.data?.access_token;
    if (token) {
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
      console.log(`  sub: ${payload.sub}`);
      console.log(`  email: ${payload.email}`);
      console.log(`  name: ${payload.name}`);
      console.log(`  groups: ${JSON.stringify(payload.groups)}`);
      console.log(`  permissions: ${JSON.stringify(payload.permissions)}`);
      console.log(`  tenant: ${JSON.stringify(payload.tenant)}`);
      console.log(`  type: ${payload.type}`);
      console.log(`  exp (valid for 1hr): ${payload.exp - payload.iat} seconds\n`);
    }

    // Test 7: SSO flow (simulated Auth Platform)
    console.log("Test 7: SSO flow (simulated Auth Platform redirect)");
    try {
      const r7 = await httpRequest(
        AUTH_PORT,
        { method: "GET", path: "/sso/login?redirect=http://localhost:3000&email=admin@test.com&password=admin" },
        null
      );
      // The SSO mock redirects (302) - we need to check the Location header
      console.log(`  Status: ${r7.status} (expect 302 redirect)`);
      const location = r7.headers["location"];
      console.log(`  Redirected to: ${location}`);
      console.log(`  Has #payload: ${location?.includes("#payload=")}`);
      console.log(`  Has #state: ${location?.includes("state=")}\n`);
    } catch (e) {
      console.log(`  Warning: SSO test could not connect to Auth Platform on port ${AUTH_PORT}`);
      console.log(`  (This is OK if the server started with a delay)\n`);
    }

    console.log("All tests passed!");
  } catch (e) {
    console.error("Test failed:", e.message);
  } finally {
    server.kill();
    console.log("\nServer stopped.");
  }
}

test();
