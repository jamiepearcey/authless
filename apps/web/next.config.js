/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { externalDir: true },
  transpilePackages: ["@ui/base", "@trpc/base", "@shared/base", "@db/base", "@i18n-core"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Improve CSS accessibility for Microsoft Clarity
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || '',
  // Ensure CSS files are accessible with proper headers
  async headers() {
    return [
      {
        source: '/_next/static/css/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
