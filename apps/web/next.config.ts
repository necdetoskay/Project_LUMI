import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  outputFileTracingIncludes: {
    "/api/**/*": [
      "../node_modules/drizzle-orm/**/*",
      "../node_modules/postgres/**/*",
      "../node_modules/@img/sharp-linux-x64/**/*",
      "../node_modules/@img/sharp-libvips-linux-x64/**/*",
    ],
  },
};

export default withNextIntl(nextConfig);
