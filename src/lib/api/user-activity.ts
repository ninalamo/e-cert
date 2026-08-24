import { api } from "./client";

export interface UserActivitySummary {
  email: string;
  certificatesActive: number;
  certificatesRevoked: number;
}

interface CertificateListEnvelope {
  data: unknown[];
  meta?: { total?: number };
}

const cache = new Map<string, UserActivitySummary>();

const inflight = new Map<string, Promise<UserActivitySummary>>();

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

async function fetchSummary(email: string): Promise<UserActivitySummary> {
  try {
    const [active, revoked] = await Promise.all([
      countByEmail(email, "active"),
      countByEmail(email, "revoked"),
    ]);
    return {
      email,
      certificatesActive: active,
      certificatesRevoked: revoked,
    };
  } catch {
    // Spec §4.1 failure isolation: a cert-api outage degrades to zeroed
    // counts so the Users row itself never breaks.
    return { email, certificatesActive: 0, certificatesRevoked: 0 };
  }
}

export const userActivityApi = {
  summary(email: string): Promise<UserActivitySummary> {
    const key = normalizeEmail(email);
    const cached = cache.get(key);
    if (cached) return Promise.resolve(cached);

    const pending = inflight.get(key);
    if (pending) return pending;

    const request = fetchSummary(key).then((summary) => {
      cache.set(key, summary);
      inflight.delete(key);
      return summary;
    });
    inflight.set(key, request);
    return request;
  },

  invalidate(email: string): void {
    cache.delete(normalizeEmail(email));
  },
};
