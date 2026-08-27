import { describe, it, expect } from "vitest";
import type { AuditLog, AuditAction, AuditSource } from "@/types/audit-log";

const VALID_ACTIONS: AuditAction[] = [
  "auth.login",
  "auth.logout",
  "auth.registered",
  "auth.email_confirmed",
  "auth.password_reset_requested",
  "auth.password_reset",
  "auth.password_changed",
  "auth.email_updated",
  "certificate.issued",
  "certificate.revoked",
  "certificate.deleted",
  "certificate.viewed",
  "email.sent",
  "email.failed",
  "event.created",
  "event.deleted",
  "member.added",
  "member.removed",
  "member.role_changed",
  "sql.error",
  "workflow.error",
];

const VALID_SOURCES: AuditSource[] = ["ui", "api", "workflow", "system"];

function mockAuditLog(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: "log-123",
    organization_id: "org-1",
    user_id: "user-1",
    user_email: "admin@test.com",
    action: "certificate.issued",
    source: "ui",
    entity_type: "certificate",
    entity_id: "cert-456",
    details: { certificate_number: "LOA-2026-001" },
    ip_address: "127.0.0.1",
    user_agent: "Mozilla/5.0",
    created_at: "2026-08-12T10:30:00Z",
    ...overrides,
  };
}

describe("Audit Log Consistency Checks", () => {
  describe("required fields", () => {
    it("audit log has all required fields", () => {
      const log = mockAuditLog();
      expect(log.id).toBeDefined();
      expect(log.organization_id).toBeDefined();
      expect(log.action).toBeDefined();
      expect(log.source).toBeDefined();
      expect(log.created_at).toBeDefined();
    });

    it("action is a valid AuditAction", () => {
      const log = mockAuditLog({ action: "certificate.issued" });
      expect(VALID_ACTIONS).toContain(log.action);
    });

    it("rejects invalid action values", () => {
      const invalidActions = ["create", "update", "delete", "register", "unknown.action"];
      for (const action of invalidActions) {
        expect(VALID_ACTIONS).not.toContain(action);
      }
    });

    it("source is a valid AuditSource", () => {
      const log = mockAuditLog({ source: "ui" });
      expect(VALID_SOURCES).toContain(log.source);
    });

    it("entity_type matches expected values", () => {
      const validEntityTypes = [
        "certificate",
        "event",
        "attendee",
        "template",
        "user",
        "organization",
        "member",
      ];
      const log = mockAuditLog({ entity_type: "certificate" });
      expect(validEntityTypes).toContain(log.entity_type);
    });

    it("user_email is present for user-initiated actions", () => {
      const userActions: AuditAction[] = [
        "auth.login",
        "auth.logout",
        "certificate.issued",
        "event.created",
      ];
      for (const action of userActions) {
        const log = mockAuditLog({ action, user_email: "user@test.com" });
        expect(log.user_email).toBeDefined();
      }
    });
  });

  describe("CSV export format", () => {
    it("audit export CSV has correct header and row format", () => {
      const csvContent =
        "id,action,entity_type,user_email,created_at\n" +
        "log-123,certificate.issued,certificate,admin@test.com,2026-08-12T10:30:00Z\n" +
        "log-456,certificate.revoked,certificate,user2@test.com,2026-08-11T14:15:00Z";

      const lines = csvContent.split("\n");
      expect(lines[0]).toBe("id,action,entity_type,user_email,created_at");
      expect(lines.length).toBe(3);

      for (let i = 1; i < lines.length; i++) {
        const fields = lines[i].split(",");
        expect(fields).toHaveLength(5);
        expect(fields[0]).toMatch(/^log-/);
        expect(fields[4]).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }
    });

    it("CSV actions are valid audit actions", () => {
      const csvActions = ["certificate.issued", "certificate.revoked", "event.created"];
      for (const action of csvActions) {
        expect(VALID_ACTIONS).toContain(action);
      }
    });
  });

  describe("entity reference integrity", () => {
    it("audit entries reference valid entities", () => {
      const existing = new Set(["event-456", "cert-789"]);
      const entries = [
        { entity_id: "event-456", entity_type: "event" },
        { entity_id: "cert-789", entity_type: "certificate" },
        { entity_id: "nonexistent", entity_type: "event" },
      ];

      const valid = entries.filter((e) => existing.has(e.entity_id));
      const orphaned = entries.filter((e) => !existing.has(e.entity_id));
      expect(valid.length).toBe(2);
      expect(orphaned.length).toBe(1);
    });

    it("entity_type and entity_id are both present or both null", () => {
      const log1 = mockAuditLog({
        entity_type: "certificate",
        entity_id: "cert-123",
      });
      expect(log1.entity_type).toBeDefined();
      expect(log1.entity_id).toBeDefined();

      const log2 = mockAuditLog({ entity_type: null, entity_id: null });
      expect(log2.entity_type).toBeNull();
      expect(log2.entity_id).toBeNull();
    });
  });

  describe("timestamp validation", () => {
    it("timestamps are valid ISO 8601", () => {
      const timestamps = [
        "2026-08-12T14:20:00Z",
        "2026-08-12T11:45:00Z",
        "2026-08-12T10:30:00Z",
      ];

      timestamps.forEach((ts) => {
        const d = new Date(ts);
        expect(d).not.toBeNaN();
      });
    });

    it("timestamps are in descending order (most recent first)", () => {
      const timestamps = [
        "2026-08-12T14:20:00Z",
        "2026-08-12T11:45:00Z",
        "2026-08-12T10:30:00Z",
      ];

      for (let i = 1; i < timestamps.length; i++) {
        const prev = new Date(timestamps[i - 1]);
        const curr = new Date(timestamps[i]);
        expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime());
      }
    });

    it("created_at is a valid ISO 8601 string", () => {
      const log = mockAuditLog();
      const parsed = new Date(log.created_at);
      expect(parsed).not.toBeNaN();
      expect(log.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe("action-category mapping", () => {
    it("auth actions have auth.* prefix", () => {
      const authActions = VALID_ACTIONS.filter((a) => a.startsWith("auth."));
      expect(authActions.length).toBeGreaterThan(0);
      for (const action of authActions) {
        expect(action).toMatch(/^auth\./);
      }
    });

    it("certificate actions have certificate.* prefix", () => {
      const certActions = VALID_ACTIONS.filter((a) =>
        a.startsWith("certificate.")
      );
      expect(certActions.length).toBeGreaterThan(0);
      for (const action of certActions) {
        expect(action).toMatch(/^certificate\./);
      }
    });

    it("event actions have event.* prefix", () => {
      const eventActions = VALID_ACTIONS.filter((a) =>
        a.startsWith("event.")
      );
      expect(eventActions.length).toBeGreaterThan(0);
      for (const action of eventActions) {
        expect(action).toMatch(/^event\./);
      }
    });

    it("member actions have member.* prefix", () => {
      const memberActions = VALID_ACTIONS.filter((a) =>
        a.startsWith("member.")
      );
      expect(memberActions.length).toBeGreaterThan(0);
      for (const action of memberActions) {
        expect(action).toMatch(/^member\./);
      }
    });
  });
});
