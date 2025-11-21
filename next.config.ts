import type { NextConfig } from "next";

const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost";

const nextConfig: NextConfig = {
  // Note: i18n is not supported in App Router - removed to fix build errors
  // Use route segments for internationalization in App Router instead
  typedRoutes: true,
  transpilePackages: ["plyr-react"],
  async rewrites() {
    return [
      // Pass through all paths for tenant subdomains (handled by middleware)
      {
        source: "/:path*",
        destination: "/:path*",
        has: [
          {
            type: "host",
            value: `(?<tenant>.+)\\.${rootDomain.replace(
              /\./g,
              "\\\\."
            )}(?:\\:\\d+)?`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
