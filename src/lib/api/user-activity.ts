import { api } from "./client";

export interface UserActivitySummary {
  email: string;
  certificatesActive: number;
  certificatesRevoked: number;
  eventsTotal: number;
  eventsAttended: number;
}

export interface UserActivityEvent {
  id: string;
  name: string | null;
  attended: boolean;
  completed: boolean;
  attendedAt: string | null;
  completedAt: string | null;
  hasCertificate: boolean;
  certificateRevoked: boolean;
}

export interface UserActivityDetail extends UserActivitySummary {
  events: UserActivityEvent[];
}

interface CertificateListEnvelope {
  data: unknown[];
  meta?: { total?: number };
}

interface LookupEnvelope {
  data: {
    email: string;
    events: Array<{
      id: string;
      name: string | null;
      attended: boolean;
      completed: boolean;
      attended_at: string | null;
      completed_at: string | null;
      has_certificate: boolean;
      certificate_revoked: boolean;
    }>;
    totals: {
      events: number;
      attended: number;
      certificates_active: number;
      certificates_revoked: number;
    };
  };
}

const cache = new Map<string, UserActivityDetail>();

const inflight = new Map<string, Promise<UserActivityDetail>>();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function countByEmail(
  email: string,
  status: "active" | "revoked"
): Promise<number> {
  const res = await api.get<CertificateListEnvelope>(
    `/certificates?recipient_email=${encodeURIComponent(email)}&status=${status}&limit=1`
  );
  return res.meta?.total ?? res.data.length;
}

async function fetchLookup(email: string): Promise<UserActivityDetail> {
  const res = await api.get<LookupEnvelope>(
    `/attendees/lookup?email=${encodeURIComponent(email)}`
  );

  return {
    email,
    certificatesActive: res.data.totals.certificates_active,
    certificatesRevoked: res.data.totals.certificates_revoked,
    eventsTotal: res.data.totals.events,
    eventsAttended: res.data.totals.attended,
    events: res.data.events.map((event) => ({
      id: event.id,
      name: event.name,
      attended: event.attended,
      completed: event.completed,
      attendedAt: event.attended_at,
      completedAt: event.completed_at,
      hasCertificate: event.has_certificate,
      certificateRevoked: event.certificate_revoked,
    })),
  };
}

async function fetchSummaryFallback(
  email: string
): Promise<UserActivityDetail> {
  try {
    const [active, revoked] = await Promise.all([
      countByEmail(email, "active"),
      countByEmail(email, "revoked"),
    ]);
    return {
      email,
      certificatesActive: active,
      certificatesRevoked: revoked,
      eventsTotal: 0,
      eventsAttended: 0,
      events: [],
    };
  } catch {
    // Spec §4.1 failure isolation: a cert-api outage degrades to zeroed
    // counts so the Users row itself never breaks.
    return {
      email,
      certificatesActive: 0,
      certificatesRevoked: 0,
      eventsTotal: 0,
      eventsAttended: 0,
      events: [],
    };
  }
}

/**
 * Phase 2 (spec §3.3/§6): prefer the aggregate `attendees/lookup` endpoint.
 * Falls back to the Phase-1 certificates-only counts when the endpoint is
 * unavailable (e.g. pre-provisioned deployments returning 403 no_catalog_entry).
 */
async function fetchDetail(email: string): Promise<UserActivityDetail> {
  try {
    return await fetchLookup(email);
  } catch {
    return fetchSummaryFallback(email);
  }
}

export const userActivityApi = {
  detail(email: string): Promise<UserActivityDetail> {
    const key = normalizeEmail(email);
    const cached = cache.get(key);
    if (cached) return Promise.resolve(cached);

    const pending = inflight.get(key);
    if (pending) return pending;

    const request = fetchDetail(key).then((detail) => {
      cache.set(key, detail);
      inflight.delete(key);
      return detail;
    });
    inflight.set(key, request);
    return request;
  },

  invalidate(email: string): void {
    cache.delete(normalizeEmail(email));
  },
};
