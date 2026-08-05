import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  outputFileTracingIncludes: {
    "/api/**/*": [
      "../node_modules/drizzle-orm/**/*",
      "../node_modules/postgres/**/*",
    ],
  },
};

export default nextConfig;
