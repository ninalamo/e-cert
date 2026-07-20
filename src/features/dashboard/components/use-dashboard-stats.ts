"use client";

import { useEffect, useState } from "react";
import { ORG_ID } from "@/lib/org";
import { getDashboardStatsAction } from "../server/dashboard.actions";

export interface DashboardStats {
  totalCertificates: number;
  activeCertificates: number;
  revokedCertificates: number;
  totalEmails: number;
}

// Module-level cache so the three consumers (sidebar, mobile-nav, stats-cards)
// share a single fetch instead of each firing their own on mount.
let cachedStats: DashboardStats | null = null;
let inflight: Promise<DashboardStats> | null = null;

async function loadStats(): Promise<DashboardStats> {
  if (cachedStats) return cachedStats;
  if (!inflight) {
    inflight = getDashboardStatsAction(ORG_ID)
      .then((data) => {
        cachedStats = data;
        inflight = null;
        return data;
      })
      .catch((err) => {
        inflight = null;
        throw err;
      });
  }
  return inflight;
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(cachedStats);
  const [loading, setLoading] = useState(cachedStats === null);

  useEffect(() => {
    let cancelled = false;
    loadStats()
      .then((data) => {
        if (!cancelled) {
          setStats(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, loading };
}
