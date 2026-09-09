import { NextRequest, NextResponse } from "next/server";

const CERT_API_URL =
  process.env.CERT_API_URL ?? "https://cert-api.lyceumalabang.edu.ph";
const AUTH_API_URL =
  process.env.AUTH_API_URL ?? "https://auth.lyceumalabang.edu.ph";

function isAuthRoute(path: string[]): boolean {
  return path.length > 0 && path[0] === "auth";
}

function buildTargetUrl(base: string, path: string[]): string {
  return `${base}/api/v1/${path.join("/")}`;
}

function forwardHeaders(
  request: NextRequest,
  includeCookies: boolean
): Headers {
  const headers = new Headers();

  const auth = request.headers.get("authorization");
  if (auth) headers.set("authorization", auth);

  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const accept = request.headers.get("accept");
  if (accept) headers.set("accept", accept);

  const xRequestedWith = request.headers.get("x-requested-with");
  if (xRequestedWith) headers.set("x-requested-with", xRequestedWith);

  if (includeCookies) {
    const cookie = request.headers.get("cookie");
    if (cookie) headers.set("cookie", cookie);
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);

  const userAgent = request.headers.get("user-agent");
  if (userAgent) headers.set("user-agent", userAgent);

  return headers;
}

async function proxyRequest(
  request: NextRequest,
  path: string[]
): Promise<NextResponse> {
  if (path.length === 0) {
    return NextResponse.json(
      { status: "error", message: "Missing API path" },
      { status: 400 }
    );
  }

  const authRoute = isAuthRoute(path);
  const baseUrl = authRoute ? AUTH_API_URL : CERT_API_URL;
  const targetUrl = buildTargetUrl(baseUrl, path);
  const headers = forwardHeaders(request, authRoute);

  let body: BodyInit | undefined = undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      const arrayBuffer = await request.arrayBuffer();
      if (arrayBuffer.byteLength > 0) {
        body = arrayBuffer;
      }
    } catch {
      // HEAD/GET already excluded; body is optional
    }
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
    });

    const responseHeaders = new Headers();
    const ct = upstream.headers.get("content-type");
    if (ct) responseHeaders.set("content-type", ct);

    const cd = upstream.headers.get("content-disposition");
    if (cd) responseHeaders.set("content-disposition", cd);

    const cl = upstream.headers.get("content-length");
    if (cl) responseHeaders.set("content-length", cl);

    const setCookie = upstream.headers.getSetCookie?.();
    if (setCookie && setCookie.length > 0) {
      for (const cookie of setCookie) {
        responseHeaders.append("set-cookie", cookie);
      }
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: "Backend unreachable",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, (await params).path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, (await params).path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, (await params).path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, (await params).path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, (await params).path);
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, (await params).path);
}

export async function OPTIONS(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, (await params).path);
}
