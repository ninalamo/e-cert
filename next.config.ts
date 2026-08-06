import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async rewrites() {
    if (process.env.NEXT_PUBLIC_CERT_API_TARGET === "live") {
      return [{
        source: "/api/v1/:path*",
        destination: "https://cert-api.lyceumalabang.edu.ph/api/v1/:path*",
      }];
    }
    return [{
      source: "/api/v1/:path*",
      destination: "http://localhost:3001/api/v1/:path*",
    }];
  },
};

export default nextConfig;
