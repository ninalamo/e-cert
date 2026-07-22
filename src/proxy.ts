import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ORG_ID } from "@/lib/org";
import { checkRateLimit } from "@/lib/rate-limit";

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

  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    request.headers.set("x-user-id", user.id);
    request.headers.set("x-user-email", user.email ?? "");
    request.headers.set("x-user-name", (user.user_metadata?.name as string) ?? "");

    const { data: membership } = await supabase
      .from("user_memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", ORG_ID)
      .single();

    request.headers.set("x-user-role", membership?.role ?? "participant");
  }

  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/certificates") ||
    request.nextUrl.pathname.startsWith("/templates") ||
    request.nextUrl.pathname.startsWith("/users");

  const isParticipantRoute =
    request.nextUrl.pathname.startsWith("/my");

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isParticipantRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
