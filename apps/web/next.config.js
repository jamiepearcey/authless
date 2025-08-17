/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { externalDir: true },
  transpilePackages: ["@ui/base", "@trpc/base", "@shared/base", "@db/base", "@i18n-core"],
};

module.exports = nextConfig;
