import { getAccessToken, refreshAccessToken } from "@/lib/auth";

const BASE_URL = "/api/v1";

const isLocalhost =
  typeof window !== "undefined" &&
  window.location.hostname === "localhost";

function decodeJwtUnsafe(
  token: string
): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized));
  } catch {
    return null;
  }
}

function userLabel(): string {
  const token = getAccessToken();
  if (!token) return "user=anonymous token=none";
  const claims = decodeJwtUnsafe(token);
  if (!claims) return "user=unknown token=invalid";
  const email = typeof claims.email === "string" ? claims.email : "unknown";
  const groups = Array.isArray(claims.groups)
    ? (claims.groups as unknown[]).join(",")
    : "";
  const expired =
    typeof claims.exp === "number" ? claims.exp * 1000 < Date.now() : true;
  return `user=${email} groups=[${groups}] token=${expired ? "EXPIRED" : "valid"}`;
}

function describeBody(body: RequestInit["body"]): unknown {
  if (!body) return undefined;
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  return "[non-JSON body]";
}

async function logApi(
  method: string,
  path: string,
  startedAt: number,
  res: Response,
  note?: string
) {
  if (!isLocalhost) return;
  const ms = Math.round(performance.now() - startedAt);
  const label = `[API] ${method} ${BASE_URL}${path} → ${res.status}${note ? ` (${note})` : ""} [${ms}ms] ${userLabel()}`;
  if (res.ok) {
    console.log(label);
    return;
  }
  const errBody = await res
    .clone()
    .json()
    .catch(() => undefined);
  console.error(label, errBody ?? "");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (typeof window === "undefined") {
    throw new Error("API client can only be used in the browser");
  }

  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const method = options.method ?? "GET";
  const startedAt = performance.now();

  if (isLocalhost) {
    console.log(
      `[API] → ${method} ${BASE_URL}${path} ${userLabel()}`,
      describeBody(options.body) ?? ""
    );
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch (err) {
    if (isLocalhost) {
      console.error(
        `[API] ${method} ${BASE_URL}${path} → network error [${Math.round(performance.now() - startedAt)}ms] ${userLabel()}`,
        err
      );
    }
    throw err;
  }

  await logApi(method, path, startedAt, res);

  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${getAccessToken()}`;
      const retryStartedAt = performance.now();
      const retry = await fetch(`${BASE_URL}${path}`, { ...options, headers });
      await logApi(method, path, retryStartedAt, retry, "after refresh");
      if (!retry.ok) {
        const retryErr = await retry
          .json()
          .catch(() => undefined);
        throw retryErr ?? { status: "error", message: `Request failed (${retry.status})` };
      }
      return retry.json();
    }
    throw { status: "error", message: "Session expired" };
  }

  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => undefined);
    throw err ?? { status: "error", message: `Request failed (${res.status})` };
  }

  if (res.headers.get("content-type")?.includes("application/pdf")) {
    return res.blob() as unknown as T;
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text);
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: "POST", body: formData }),
};
