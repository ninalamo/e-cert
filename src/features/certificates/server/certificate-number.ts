import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_PATTERN = "EPOCH";

function epochFallback(): string {
  const epoch = Date.now();
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `${epoch}-${rand}`;
}

function formatPattern(pattern: string, value: number): string {
  const padded = String(value).padStart(4, "0");
  return pattern.replace(/#+/g, (match) => {
    const width = match.length;
    return String(value).padStart(width, "0").slice(-width).padStart(padded.length, "0");
  });
}

export async function generateCertificateNumber(
  opts?: {
    organizationId?: string;
    pattern?: string | null;
    client?: SupabaseClient;
  }
): Promise<string> {
  const pattern = opts?.pattern ?? DEFAULT_PATTERN;

  if (pattern === DEFAULT_PATTERN || !opts?.organizationId || !opts?.client) {
    return epochFallback();
  }

  const { data, error } = await opts.client.rpc("next_certificate_number", {
    p_org_id: opts.organizationId,
    p_pattern: pattern,
  });

  if (error || typeof data !== "number") {
    return epochFallback();
  }

  return formatPattern(pattern, data);
}
