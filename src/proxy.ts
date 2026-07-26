import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ORG_ID } from "@/lib/org";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyToken } from "@/lib/auth";

const RATE_LIMITS: { pattern: RegExp; maxRequests: number; windowMs: number }[] = [
  { pattern: /^\/api\/verify\//, maxRequests: 30, windowMs: 60_000 },
  { pattern: /^\/api\/certificates\/[^/]+\/download/, maxRequests: 10, windowMs: 60_000 },
];

function getRateLimitKey(request: NextRequest, pathname: string): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
  return `${pathname}:${ip}`;
}

function getAllowedOrigin(): string | null {
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  if (base) return base.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

function isCsrfSafe(request: NextRequest): boolean {
  if (request.method !== "POST") return true;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const allowed = getAllowedOrigin();

  if (!allowed) return true;

  if (origin) {
    return origin.replace(/\/+$/, "") === allowed;
  }

  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      return refererOrigin === allowed;
    } catch {
      return false;
    }
  }

  return false;
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function proxy(request: NextRequest) {
  if (!isCsrfSafe(request)) {
    return NextResponse.json(
      { error: "CSRF validation failed" },
      { status: 403 }
    );
  }

  const { pathname } = request.nextUrl;
  for (const { pattern, maxRequests, windowMs } of RATE_LIMITS) {
    if (pattern.test(pathname)) {
      const key = getRateLimitKey(request, pathname);
      const result = checkRateLimit(key, maxRequests, windowMs);
      if (!result.allowed) {
        return NextResponse.json(
          { error: "Too many requests" },
          {
            status: 429,
            headers: {
              "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
              "X-RateLimit-Limit": String(maxRequests),
              "X-RateLimit-Remaining": "0",
            },
          }
        );
      }
    }
  }

  const response = NextResponse.next({ request });

  const sessionToken = request.cookies.get("session")?.value;
  const jwtPayload = sessionToken ? await verifyToken(sessionToken) : null;

  if (jwtPayload) {
    const db = supabaseAdmin();
    if (db) {
      const { data: membership } = await db
        .from("user_memberships")
        .select("role")
        .eq("user_id", jwtPayload.sub)
        .eq("organization_id", ORG_ID)
        .single();

      request.headers.set("x-user-id", jwtPayload.sub);
      request.headers.set("x-user-email", jwtPayload.email ?? "");
      request.headers.set("x-user-name", jwtPayload.name ?? "");
      request.headers.set("x-user-role", membership?.role ?? "participant");
    }
  }

  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/certificates") ||
    pathname.startsWith("/templates") ||
    pathname.startsWith("/users");

  const isParticipantRoute = pathname.startsWith("/my");

  if ((isProtectedRoute || isParticipantRoute) && !jwtPayload) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.well-known/workflow/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
