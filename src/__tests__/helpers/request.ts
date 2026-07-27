import { NextRequest } from "next/server";

export function createNextRequest(
  url: string,
  opts?: { method?: string; headers?: Record<string, string>; body?: string }
): NextRequest {
  return new NextRequest(url, {
    method: opts?.method ?? "GET",
    headers: opts?.headers,
    body: opts?.body,
  });
}
