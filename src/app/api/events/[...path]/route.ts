import { NextRequest, NextResponse } from "next/server";

const CERT_API_URL =
  process.env.CERT_API_URL ?? "https://cert-api.lyceumalabang.edu.ph";

function buildTargetUrl(base: string, path: string[], searchParams: URLSearchParams): string {
  const qs = searchParams.toString();
  const base_url = `${base}/api/v1/events/${path.join("/")}`;
  return qs ? `${base_url}?${qs}` : base_url;
}

function forwardHeaders(request: NextRequest): Headers {
  const headers = new Headers();

  const auth = request.headers.get("authorization");
  if (auth) headers.set("authorization", auth);

  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const accept = request.headers.get("accept");
  if (accept) headers.set("accept", accept);

  const xRequestedWith = request.headers.get("x-requested-with");
  if (xRequestedWith) headers.set("x-requested-with", xRequestedWith);

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

  const targetUrl = buildTargetUrl(CERT_API_URL, path, request.nextUrl.searchParams);
  const headers = forwardHeaders(request);

  let body: BodyInit | undefined = undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      const arrayBuffer = await request.arrayBuffer();
      if (arrayBuffer.byteLength > 0) {
        body = arrayBuffer;
      }
    } catch {
      // body is optional
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
