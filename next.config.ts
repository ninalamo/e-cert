import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async rewrites() {
    const target = process.env.NEXT_PUBLIC_CERT_API_TARGET;
    let destination: string;
    if (target === "live") {
      destination = "https://cert-api.lyceumalabang.edu.ph/api/v1/:path*";
    } else if (target === "local") {
      destination = "http://localhost:9001/api/v1/:path*";
    } else {
      destination = "http://localhost:3001/api/v1/:path*";
    }
    return [{ source: "/api/v1/:path*", destination }];
  },
};

export default nextConfig;
