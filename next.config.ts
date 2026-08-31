import type { NextConfig } from "next";

const CERT_BASE = process.env.NEXT_PUBLIC_CERT_API_URL ?? "https://cert-api.lyceumalabang.edu.ph";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async rewrites() {
    return [
      { source: "/api/events/:path*", destination: `${CERT_BASE}/api/v1/events/:path*` },
      { source: "/api/v1/:path*", destination: `${CERT_BASE}/api/v1/:path*` },
    ];
  },
};

export default nextConfig;
