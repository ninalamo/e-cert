import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

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

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
