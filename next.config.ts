import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  poweredByHeader: false,
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
