import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
const PORT = process.env.MOCK_PORT || 3001;

// Load seed data
const dbPath = path.join(__dirname, "db.json");
let db = JSON.parse(fs.readFileSync(dbPath, "utf8"));

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "https://e-cert.vercel.app"],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Envelope wrapper - wraps all responses in { data: ... } format
const envelope = (req: any, res: any, next: any) => {
  const originalJson = res.json.bind(res);
  res.json = function(data: any) {
    // Don't wrap binary responses
    if (req.path.includes("/pdf") || req.path.includes("/download")) {
      return originalJson(data);
    }
    // Don't double-wrap already-wrapped responses
    if (data && (data.data !== undefined || data.status || data.meta)) {
      return originalJson(data);
    }
    // Wrap arrays and plain objects
    if (Array.isArray(data)) {
      return originalJson({ data: data });
    }
    if (data && typeof data === "object") {
      return originalJson({ data: data });
    }
    return originalJson(data);
  };
  next();
};

// Helper to save db to disk
const saveDb = () => {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
};

applyAuthHandlers(app, envelope);
applyEventsHandlers(app, envelope, db, saveDb);
applyAttendeesHandlers(app, envelope, db, saveDb);
applyCertificateHandlers(app, envelope, db, saveDb);
applyTemplateHandlers(app, envelope, db, saveDb);
applyDashboardHandlers(app, envelope, db);
applyAuditHandlers(app, envelope, db);
applyVerifyHandlers(app, envelope, db);

// Generic CRUD handlers (fallback for resource collections)
applyCRUDHandlers(app, envelope, db, saveDb);

function applyCRUDHandlers(server: any, envelope: any, db: any, saveDb: any) {
  const resources = {
    events: "events",
    attendees: "event_attendees",
    certificates: "certificates",
    templates: "templates",
    audit_logs: "audit_logs",
    sequences: "sequences",
  };

  for (const [routeName, dbKey] of Object.entries(resources)) {
    const basePath = `/api/v1/${routeName}`;

    // GET /api/v1/:resource - list with pagination
    server.get(basePath, envelope, (req: any, res: any) => {
      const { limit = 25, offset = 0, ...filters } = req.query;
      let items = db[dbKey] || [];

      // Apply filters
      for (const [key, value] of Object.entries(filters)) {
        items = items.filter((item: any) => {
          const itemValue = item[key];
          if (itemValue === undefined || itemValue === null) return false;
          return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
        });
      }

      const sliced = items.slice(Number(offset), Number(offset) + Number(limit));
      res.json({
        data: sliced,
        meta: {
          limit: Number(limit),
          offset: Number(offset),
          total: items.length,
          has_more: Number(offset) + Number(limit) < items.length,
        },
      });
    });

    // GET /api/v1/:resource/:id - single item
    server.get(`${basePath}/:id`, envelope, (req: any, res: any) => {
      const item = (db[dbKey] || []).find((i: any) => i.id === req.params.id);
      if (!item) {
        return res.status(404).json({
          status: "error",
          message: `${routeName.slice(0, -1)} not found`,
        });
      }
      res.json({ data: item });
    });

    // POST /api/v1/:resource - create
    server.post(basePath, envelope, (req: any, res: any) => {
      const newItem = {
        id: `${routeName.slice(0, -1)}-${Date.now()}`,
        ...req.body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db[dbKey] = [...(db[dbKey] || []), newItem];
      saveDb();
      res.status(201).json({ data: newItem });
    });

    // PATCH /api/v1/:resource/:id - update
    server.patch(`${basePath}/:id`, envelope, (req: any, res: any) => {
      const items = db[dbKey] || [];
      const index = items.findIndex((i: any) => i.id === req.params.id);
      if (index === -1) {
        return res.status(404).json({
          status: "error",
          message: `${routeName.slice(0, -1)} not found`,
        });
      }
      const updated = { ...items[index], ...req.body, updated_at: new Date().toISOString() };
      items[index] = updated;
      saveDb();
      res.json({ data: updated });
    });

    // DELETE /api/v1/:resource/:id - delete
    server.delete(`${basePath}/:id`, envelope, (req: any, res: any) => {
      const items = db[dbKey] || [];
      const index = items.findIndex((i: any) => i.id === req.params.id);
      if (index === -1) {
        return res.status(404).json({
          status: "error",
          message: `${routeName.slice(0, -1)} not found`,
        });
      }
      items.splice(index, 1);
      saveDb();
      res.json({ status: "ok" });
    });
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Mock Cert API (v1.2) running on http://localhost:${PORT}`);
  console.log("Endpoints:");
  console.log("  Auth:         /api/v1/auth/sso/login, /auth/callback, /auth/tokens, /auth/refresh, /auth/logout, /auth/access, /auth/test-users");
  console.log("  Events:       /api/v1/events/*");
  console.log("  Attendees:    /api/v1/events/:id/attendees/*, /api/v1/attendees/*");
  console.log("  Certificates: /api/v1/certificates/*, /api/v1/me/certificates/*, /api/v1/certificates/qr");
  console.log("  Templates:    /api/v1/templates/*");
  console.log("  Dashboard:    /api/v1/dashboard/*");
  console.log("  Audit:        /api/v1/admin/audit-logs");
  console.log("  Public:       /api/v1/verify/*, /api/v1/view/*");
});

// Mock Auth Platform (SSO) runs on port 3002
// Starts after the main server's callback logs

// In-memory session store (refresh token → user info)
const sessions: Record<string, { user: any; refresh_token: string; created_at: string }> = {};
const refreshTokens: Record<string, { user: any; expires_at: number }> = {};

const testUsers: Record<string, any> = {
  "admin@test.com": {
    sub: "admin-uuid",
    email: "admin@test.com",
    name: "Admin User",
    groups: ["cert-admin"],
    permissions: ["admin:/api/v1/*", "read:/api/v1/events"],
    role: "admin",
    password: "admin", // Only for mock - never in production
  },
  "staff@test.com": {
    sub: "staff-uuid",
    email: "staff@test.com",
    name: "Staff User",
    groups: ["cert-staff"],
    permissions: ["write:/api/v1/events", "write:/api/v1/certificates", "read:/api/v1/*"],
    role: "staff",
    password: "staff",
  },
  "participant@test.com": {
    sub: "participant-uuid",
    email: "participant@test.com",
    name: "Participant User",
    groups: ["cert-user"],
    permissions: ["read:/api/v1/me/certificates"],
    role: "participant",
    password: "participant",
  },
};

const createMockJWT = (user: any) => {
  const fullPayload = {
    sub: user.sub,
    email: user.email,
    name: user.name,
    groups: user.groups,
    permissions: user.permissions,
    scopes: [],
    tenant: { id: "test-tenant", slug: "loa-e-cert" },
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    type: "access",
  };

  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payloadBase64 = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const signature = Buffer.from("mock-signature").toString("base64url");

  return `${header}.${payloadBase64}.${signature}`;
};

const issueRefreshToken = (user: any): string => {
  const refreshToken = Buffer.from(`${user.email}:${Date.now()}:${Math.random()}`).toString("hex");
  refreshTokens[refreshToken] = {
    user,
    expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  sessions[refreshToken] = {
    user,
    refresh_token: refreshToken,
    created_at: new Date().toISOString(),
  };
  return refreshToken;
};

// Handlers for auth endpoints
function applyAuthHandlers(server: any, envelope: any) {
  // SSO login - initiates SSO flow (mock)
  server.get("/api/v1/auth/sso/login", envelope, (_req: any, res: any) => {
    res.json({
      data: {
        redirect_url: "https://auth.lyceumalabang.edu.ph/sso/login?redirect=http://localhost:3000",
        auth_url: "https://auth.lyceumalabang.edu.ph/sso/login?redirect=http://localhost:3000",
      },
    });
  });

  // SSO callback - processes SSO response and issues tokens
  server.post("/api/v1/auth/callback", envelope, (req: any, res: any) => {
    const { payload } = req.body;

    if (!payload) {
      return res.status(400).json({
        status: "error",
        message: "Missing SSO payload",
      });
    }

    // In real SSO, payload would be decrypted. For mock, we use the email from payload
    const email = payload.email || "admin@test.com";
    const user = testUsers[email] || testUsers["admin@test.com"];

    const accessToken = createMockJWT(user);
    const refreshToken = issueRefreshToken(user);

    res.cookie("loa_cert_refresh", refreshToken, {
      httpOnly: true,
      secure: false, // Set to true in production
      sameSite: "lax",
      path: "/api/v1/auth",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
    });
  });

  // Token refresh - issues new access token using refresh cookie
  server.post("/api/v1/auth/refresh", envelope, (req: any, res: any) => {
    const refreshToken = req.cookies?.loa_cert_refresh;

    if (!refreshToken) {
      return res.status(401).json({
        status: "error",
        message: "Missing refresh token",
      });
    }

    const session = refreshTokens[refreshToken];
    if (!session) {
      return res.status(401).json({
        status: "error",
        message: "Invalid or expired refresh token",
      });
    }

    if (session.expires_at < Date.now()) {
      delete refreshTokens[refreshToken];
      delete sessions[refreshToken];
      return res.status(401).json({
        status: "error",
        message: "Refresh token expired",
      });
    }

    const accessToken = createMockJWT(session.user);
    res.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
    });
  });

  // Logout - clears session and refresh token
  server.post("/api/v1/auth/logout", envelope, (req: any, res: any) => {
    const refreshToken = req.cookies?.loa_cert_refresh;

    if (refreshToken && refreshTokens[refreshToken]) {
      delete refreshTokens[refreshToken];
      delete sessions[refreshToken];
    }

    res.clearCookie("loa_cert_refresh", { path: "/api/v1/auth" });
    res.json({ status: "ok", message: "Logged out successfully" });
  });

  // Access check - returns current user info
  server.get("/api/v1/auth/access", envelope, (req: any, res: any) => {
    const refreshToken = req.cookies?.loa_cert_refresh;

    if (!refreshToken) {
      return res.status(401).json({
        status: "error",
        message: "Not authenticated",
      });
    }

    const session = refreshTokens[refreshToken];
    if (!session || session.expires_at < Date.now()) {
      return res.status(401).json({
        status: "error",
        message: "Session expired",
      });
    }

    res.json({
      data: {
        user: {
          sub: session.user.sub,
          email: session.user.email,
          name: session.user.name,
        },
        groups: session.user.groups,
        permissions: session.user.permissions,
        tenant: { id: "test-tenant", slug: "loa-e-cert" },
        role: session.user.role,
      },
    });
  });

  // Direct token issuance for testing (bypass SSO)
  server.post("/api/v1/auth/tokens", envelope, (req: any, res: any) => {
    const { email, password } = req.body;

    let user: any = null;

    if (email && password) {
      const candidate = testUsers[email];
      if (candidate && candidate.password === password) {
        user = candidate;
      }
    } else if (email) {
      user = testUsers[email] || null;
    }

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials",
      });
    }

    const accessToken = createMockJWT(user);
    const refreshToken = issueRefreshToken(user);

    res.cookie("loa_cert_refresh", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/api/v1/auth",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
    });
  });

  // Get available test users (mock-only, for development/testing)
  server.get("/api/v1/auth/test-users", envelope, (_req: any, res: any) => {
    res.json({
      data: Object.entries(testUsers).map(([email, user]: [string, any]) => ({
        email,
        name: user.name,
        role: user.role,
        groups: user.groups,
      })),
    });
  });
}

// Mock Auth Platform SSO server (port 3002) - simulates auth.lyceumalabang.edu.ph
const AUTH_PORT = process.env.MOCK_AUTH_PORT || 3002;
const authApp = express();
const appState: Record<string, { email: string; redirect: string }> = {};

authApp.use(cors({
  origin: ["http://localhost:3000"],
  credentials: true,
}));
authApp.use(express.json());
authApp.use(express.urlencoded({ extended: true }));

// SSO login page simulation
authApp.get("/sso/login", (req: any, res: any) => {
  const redirect = req.query.redirect || "http://localhost:3000";
  const state = Math.random().toString(36).substring(7);
  appState[state] = { email: req.query.email as string, redirect: redirect as string };

  if (req.query.email && req.query.password) {
    // Auto-login mode (for testing with credentials)
    const user = testUsers[req.query.email as string];
    if (user && user.password === req.query.password) {
      const payload = Buffer.from(JSON.stringify({ email: user.email, state })).toString("base64url");
      return res.redirect(302, `${redirect}#payload=${payload}&state=${state}`);
    }
    return res.status(401).send("Invalid credentials");
  }

  // If email provided but no password, show login page
  // If no email, show login page selection
  res.send(`<!DOCTYPE html>
<html>
<head><title>Mock SSO Login</title></head>
<body>
  <h1>Mock Auth Platform SSO</h1>
  <form method="post" action="/sso/login">
    <input type="hidden" name="state" value="${state}" />
    <input type="hidden" name="redirect" value="${redirect}" />
    <label>Email: <input type="email" name="email" value="${req.query.email || ""}"></label><br/>
    <label>Password: <input type="password" name="password" /></label><br/>
    <button type="submit">Login</button>
  </form>
  <p>Quick login as:</p>
  <ul>
    <li><a href="/sso/login?redirect=${encodeURIComponent(redirect)}&email=admin@test.com&password=admin">Admin</a></li>
    <li><a href="/sso/login?redirect=${encodeURIComponent(redirect)}&email=staff@test.com&password=staff">Staff</a></li>
    <li><a href="/sso/login?redirect=${encodeURIComponent(redirect)}&email=participant@test.com&password=participant">Participant</a></li>
  </ul>
</body>
</html>`);
});

// Handle SSO form submission
authApp.post("/sso/login", (req: any, res: any) => {
  const { email, password, state, redirect } = req.body;
  const user = testUsers[email];
  if (!user || user.password !== password) {
    return res.status(401).send("Invalid credentials");
  }
  const payload = Buffer.from(JSON.stringify({ email, state })).toString("base64url");
  res.redirect(302, `${redirect}#payload=${payload}&state=${state}`);
});

const authServer = authApp.listen(AUTH_PORT, () => {
  console.log(`\nMock Auth Platform (SSO) running on http://localhost:${AUTH_PORT}`);
  console.log("Endpoints:");
  console.log("  SSO:          GET /sso/login?redirect=<url>&email=<email>&password=<password>");
  console.log("  Quick login:  /sso/login?redirect=<url>&email=admin@test.com&password=admin");
});

// Handlers for events endpoints
function applyEventsHandlers(server: any, envelope: any, db: any, saveDb: any) {
  server.get("/api/v1/events/:id/stats", envelope, (req: any, res: any) => {
    const eventId = req.params.id;
    const event = db.events.find((e: any) => e.id === eventId);

    if (!event) {
      return res.status(404).json({ status: "error", message: "Event not found" });
    }

    const attendees = db.event_attendees.filter((a: any) => a.event_id === eventId);

    res.json({
      data: {
        event_id: eventId,
        total_attendees: attendees.length,
        issued: attendees.filter((a: any) => a.status === "issued").length,
        pending: attendees.filter((a: any) => a.status === "pending").length,
        revoked: attendees.filter((a: any) => a.status === "revoked").length,
      },
    });
  });

  server.post("/api/v1/events/:id/clone-template", envelope, (req: any, res: any) => {
    const event = db.events.find((e: any) => e.id === req.params.id);
    if (!event) {
      return res.status(404).json({ status: "error", message: "Event not found" });
    }

    const defaultTemplate = db.templates.find((t: any) => t.is_default && t.type === "certificate");
    if (!defaultTemplate) {
      return res.status(404).json({ status: "error", message: "No default template" });
    }

    res.status(201).json({
      data: {
        id: `clone-${Date.now()}`,
        name: `${defaultTemplate.name} (cloned)`,
        type: "certificate",
        content: defaultTemplate.content,
        is_locked: false,
        event_id: req.params.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  });

  server.post("/api/v1/events/:id/clone-email-template", envelope, (req: any, res: any) => {
    res.status(201).json({
      data: {
        id: `clone-email-${Date.now()}`,
        name: "Cloned Email Template",
        type: "email",
        content: "<p>Your certificate is ready for <strong>{{event_name}}</strong></p>",
        is_locked: false,
        event_id: req.params.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  });

  server.post("/api/v1/events/:id/bulk-issue", envelope, (req: any, res: any) => {
    const event = db.events.find((e: any) => e.id === req.params.id);
    if (!event) {
      return res.status(404).json({ status: "error", message: "Event not found" });
    }

    const attendees = db.event_attendees.filter((a: any) => a.event_id === req.params.id && a.status === "pending");

    res.json({
      data: {
        success: attendees.length,
        failed: 0,
        errors: [],
        results: attendees.map((a: any) => ({
          attendee_id: a.id,
          certificate_number: `LOA-2026-${req.params.id}-${Date.now()}-${a.id}`,
          status: "issued",
        })),
      },
    });
  });

  server.post("/api/v1/events/:id/reissue", envelope, (req: any, res: any) => {
    res.json({
      data: {
        success: db.certificates.filter((c: any) => c.event_id === req.params.id).length,
        failed: 0,
        errors: [],
      },
    });
  });

  server.post("/api/v1/events/:id/revoke-expired", envelope, (_req: any, res: any) => {
    res.json({ data: { revoked_count: 0, revoked_at: new Date().toISOString() } });
  });

  server.get("/api/v1/events/:id/revoke-expired", envelope, (_req: any, res: any) => {
    res.json({ data: { revokeable_count: 0 } });
  });
}

// Handlers for attendees endpoints
function applyAttendeesHandlers(server: any, envelope: any, db: any, saveDb: any) {
  server.post("/api/v1/events/:id/attendees", envelope, (req: any, res: any) => {
    if (!req.body.name || !req.body.email) {
      return res.status(422).json({
        status: "error",
        message: "Validation failed",
        errors: { name: ["Name is required"], email: ["Email is required"] },
      });
    }

    res.status(201).json({
      data: {
        id: `att-${Date.now()}`,
        event_id: req.params.id,
        ...req.body,
        certificate_number: null,
        status: "pending",
        created_at: new Date().toISOString(),
      },
    });
  });

  server.post("/api/v1/events/:id/attendees/import", envelope, (req: any, res: any) => {
    const { attendees } = req.body;

    if (!Array.isArray(attendees)) {
      return res.status(422).json({
        status: "error",
        message: "Validation failed",
        errors: { attendees: ["Must be an array"] },
      });
    }

    res.status(201).json({
      data: {
        success: attendees.length,
        failed: 0,
        errors: [],
        imported: attendees.map((a: any, i: number) => ({
          id: `imp-${Date.now()}-${i}`,
          event_id: req.params.id,
          ...a,
          certificate_number: null,
          status: "pending",
          created_at: new Date().toISOString(),
        })),
      },
    });
  });

  server.post("/api/v1/events/:id/issue-completed", envelope, (_req: any, res: any) => {
    res.json({ data: { success: 5, failed: 0, errors: [] } });
  });

  server.get("/api/v1/attendees/:id/delete-preview", envelope, (req: any, res: any) => {
    res.json({
      data: {
        attendee_id: req.params.id,
        has_certificate: true,
        certificate_count: 1,
        will_delete_certificates: true,
      },
    });
  });

  server.get("/api/v1/attendees/:id/file-data", envelope, (req: any, res: any) => {
    res.json({
      data: {
        attendee_id: req.params.id,
        file_data: "mock-base64-file-data==",
        content_type: "application/pdf",
      },
    });
  });

  server.delete("/api/v1/attendees/:id/with-cert", envelope, (_req: any, res: any) => {
    res.json({ status: "ok" });
  });
}

// Handlers for certificates endpoints
function applyCertificateHandlers(server: any, envelope: any, db: any, saveDb: any) {
  server.get("/api/v1/certificates/qr", envelope, (req: any, res: any) => {
    res.json({
      data: {
        qr_image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==",
        certificate_number: req.query.certificate_number,
        attendee_name: req.query.attendee_name,
      },
    });
  });

  server.post("/api/v1/certificates/bulk", envelope, (req: any, res: any) => {
    const { event_id, template_id, attendees } = req.body;

    if (!event_id) {
      return res.status(422).json({
        status: "error",
        message: "Validation failed",
        errors: { event_id: ["Event ID is required"] },
      });
    }

    res.json({
      data: {
        success: attendees?.length || 0,
        failed: 0,
        errors: [],
        results: (attendees || []).map((a: any, i: number) => ({
          attendee_id: a.id,
          certificate_number: `LOA-2026-BULK-${i + 1}`,
          status: "issued",
        })),
      },
    });
  });

  server.post("/api/v1/certificates/upload", envelope, (req: any, res: any) => {
    res.status(201).json({
      data: {
        id: `cert-${Date.now()}`,
        file_path: `/certificates/uploaded/cert-${Date.now()}.pdf`,
        size: 1024,
        uploaded_at: new Date().toISOString(),
      },
    });
  });

  server.post("/api/v1/certificates/:id/email", envelope, (req: any, res: any) => {
    res.json({
      data: {
        certificate_id: req.params.id,
        email_sent: true,
        email_log_id: `el-${Date.now()}`,
      },
    });
  });

  server.post("/api/v1/certificates/:id/revoke", envelope, (req: any, res: any) => {
    res.json({
      data: {
        certificate_id: req.params.id,
        status: "revoked",
        revoked_at: new Date().toISOString(),
        reason: req.body?.reason || "Administrative action",
      },
    });
  });

  server.get("/api/v1/certificates/:id/pdf", (req: any, res: any) => {
    const cert = db.certificates.find((c: any) => c.id === req.params.id);
    if (!cert) {
      return res.status(404).json({ status: "error", message: "Certificate not found" });
    }
    const fakePdf = Buffer.from(
      "%PDF-1.4 1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj xref 0 4 Trailer<</Size 4/Root 1 0 R>>",
      "latin1"
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="certificate-${req.params.id}.pdf"`);
    res.send(fakePdf);
  });

  server.get("/api/v1/certificates/:id/download", (req: any, res: any) => {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="certificate-${req.params.id}.pdf"`);
    res.send(Buffer.from("MOCK-PDF-CONTENT", "latin1"));
  });

  server.get("/api/v1/certificates/:id/email-logs", envelope, (req: any, res: any) => {
    res.json({
      data: [
        {
          id: `el-${req.params.id}-1`,
          sent_to: "recipient@example.com",
          sent_at: "2026-04-15T16:30:00Z",
          status: "sent",
        },
      ],
    });
  });

  server.get("/api/v1/me/certificates", envelope, (_req: any, res: any) => {
    res.json({
      data: db.certificates,
      meta: { limit: 25, offset: 0, total: db.certificates.length, has_more: false },
    });
  });

  server.get("/api/v1/me/certificates/:id", envelope, (req: any, res: any) => {
    const cert = db.certificates.find((c: any) => c.id === req.params.id);
    if (!cert) {
      return res.status(404).json({ status: "error", message: "Certificate not found" });
    }
    res.json({ data: cert });
  });
}

// Handlers for templates
function applyTemplateHandlers(server: any, envelope: any, db: any, saveDb: any) {
  server.post("/api/v1/templates", envelope, (req: any, res: any) => {
    const { name, type, content } = req.body;

    if (!name || !type || !content) {
      return res.status(422).json({
        status: "error",
        message: "Validation failed",
        errors: {
          name: name ? undefined : ["Name is required"],
          type: type ? undefined : ["Type is required"],
          content: content ? undefined : ["Content is required"],
        },
      });
    }

    res.status(201).json({
      data: {
        id: `tmpl-${Date.now()}`,
        name, type, content,
        is_locked: false,
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  });

  server.patch("/api/v1/templates/:id", envelope, (req: any, res: any) => {
    const template = db.templates.find((t: any) => t.id === req.params.id);
    if (!template) {
      return res.status(404).json({ status: "error", message: "Template not found" });
    }
    if (template.is_locked) {
      return res.status(409).json({ status: "error", message: "Template is locked" });
    }
    res.json({ data: { ...template, ...req.body, updated_at: new Date().toISOString() } });
  });

  server.delete("/api/v1/templates/:id", envelope, (req: any, res: any) => {
    const template = db.templates.find((t: any) => t.id === req.params.id);
    if (!template) {
      return res.status(404).json({ status: "error", message: "Template not found" });
    }
    if (template.is_locked) {
      return res.status(409).json({ status: "error", message: "Cannot delete locked template" });
    }
    const hasCerts = db.certificates.some((c: any) => c.template_id === req.params.id);
    if (hasCerts) {
      return res.status(409).json({ status: "error", message: "Template is referenced by certificates" });
    }
    res.json({ status: "ok" });
  });
}

// Handlers for dashboard
function applyDashboardHandlers(server: any, envelope: any, db: any) {
  server.get("/api/v1/dashboard/stats", envelope, (_req: any, res: any) => {
    res.json({
      data: {
        total_events: db.events.length,
        total_certificates: db.certificates.filter((c: any) => c.status !== "revoked").length,
        total_attendees: db.event_attendees.length,
        certificates_issued: db.certificates.filter((c: any) => c.status === "issued").length,
        certificates_revoked: db.certificates.filter((c: any) => c.status === "revoked").length,
        events_by_status: {
          active: db.events.filter((e: any) => e.status === "active").length,
          upcoming: db.events.filter((e: any) => e.status === "upcoming").length,
          archived: db.events.filter((e: any) => e.status === "archived").length,
        },
      },
    });
  });

  server.get("/api/v1/dashboard/activity", envelope, (_req: any, res: any) => {
    const activity = db.audit_logs
      .sort((a: any, b: any) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)
      .map((log: any) => ({
        id: log.id,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        user_email: log.user_email,
        details: log.details,
        created_at: log.created_at,
      }));

    res.json({ data: activity });
  });
}

// Handlers for audit
function applyAuditHandlers(server: any, envelope: any, db: any) {
  server.get("/api/v1/admin/audit-logs", envelope, (req: any, res: any) => {
    const { limit = 25, offset = 0, action, user_id } = req.query;

    let filtered = db.audit_logs;
    if (action) filtered = filtered.filter((log: any) => log.action === action);
    if (user_id) filtered = filtered.filter((log: any) => log.user_id === user_id);

    const sorted = filtered.sort(
      (a: any, b: any) => new Date(b.created_at) - new Date(a.created_at)
    );
    const sliced = sorted.slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      data: sliced,
      meta: {
        limit: Number(limit),
        offset: Number(offset),
        total: filtered.length,
        has_more: Number(offset) + Number(limit) < filtered.length,
      },
    });
  });

  server.get("/api/v1/admin/audit-logs/export", (req: any, res: any) => {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="audit-logs.csv"');

    const csv =
      "id,action,entity_type,user_email,created_at\n" +
      db.audit_logs
        .map((log: any) => `"${log.id}","${log.action}","${log.entity_type}","${log.user_email}","${log.created_at}"`)
        .join("\n");

    res.send(csv);
  });
}

// Handlers for public endpoints
function applyVerifyHandlers(server: any, envelope: any, db: any) {
  server.get("/api/v1/verify/:certificate_number", envelope, (req: any, res: any) => {
    const cert = db.certificates.find(
      (c: any) => c.certificate_number === req.params.certificate_number
    );

    if (!cert || cert.status === "revoked") {
      return res.status(404).json({ status: "error", message: "Certificate not found or invalid" });
    }

    const event = db.events.find((e: any) => e.id === cert.event_id);
    res.json({
      data: {
        certificate_number: cert.certificate_number,
        attendee_name: cert.attendee_name,
        event_name: event?.name || "Unknown Event",
        issued_at: cert.issued_at,
        status: "valid",
        template_name: cert.template_name,
      },
    });
  });

  server.get("/api/v1/view/:id", envelope, (req: any, res: any) => {
    const cert = db.certificates.find((c: any) => c.id === req.params.id);
    if (!cert) {
      return res.status(404).json({ status: "error", message: "Certificate not found" });
    }
    res.json({ data: { id: cert.id, certificate_number: cert.certificate_number, attendee_name: cert.attendee_name, attendee_email: cert.attendee_email, event_id: cert.event_id, template_id: cert.template_id, issued_at: cert.issued_at, status: cert.status } });
  });
}
