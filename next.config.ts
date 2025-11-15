import type { NextConfig } from "next";

const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost";

const nextConfig: NextConfig = {
  i18n: {
    locales: ["uz"],
    defaultLocale: "uz",
  },
  experimental: {
    typedRoutes: true,
  },
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
