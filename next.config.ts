import type { NextConfig } from "next";

/**
 * Environment switch:
 *   USE_LOCAL_STACK=true   → local Docker services (auth nginx :8080, cert nginx :9001)
 *   unset / false          → cPanel deployments (hosts below, overridable)
 */
const useLocalStack = process.env.USE_LOCAL_STACK === "true";

const AUTH_BASE = useLocalStack
  ? "http://localhost:8080"
  : process.env.CPANEL_AUTH_BASE_URL ?? "https://auth.lyceumalabang.edu.ph";

const CERT_BASE = useLocalStack
  ? "http://localhost:9001"
  : process.env.CPANEL_CERT_API_URL ?? "https://cert-api.lyceumalabang.edu.ph";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // Injected so client code (SSO redirect, forgot-password link) follows the switch.
  env: {
    NEXT_PUBLIC_AUTH_BASE_URL: AUTH_BASE,
  },
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${CERT_BASE}/api/v1/:path*` },
    ];
  },
};

export default nextConfig;
