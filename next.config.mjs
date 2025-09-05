/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Be lenient with ESM externals (helps with TLA packages)
    esmExternals: "loose",
    // Keep these out of the RSC graph resolution
    serverComponentsExternalPackages: [
      "@finos/perspective",
      "@finos/perspective-viewer",
      "@finos/perspective-react",
      "@finos/perspective-viewer-datagrid",
      "@finos/perspective-viewer-d3fc",
    ],
  },
  webpack: (config, { isServer }) => {
    // If the server ever sees these, keep them external so it doesn't transpile/bundle
    if (isServer) {
      const externals = Array.isArray(config.externals) ? config.externals : [];
      config.externals = [
        ...externals,
        "@finos/perspective",
        "@finos/perspective-viewer",
        "@finos/perspective-react",
        "@finos/perspective-viewer-datagrid",
        "@finos/perspective-viewer-d3fc",
      ];
      // Optional hard guard: if anything accidentally imports them on server, alias to an empty module
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        // comment any of these out if you do intentional server usage later
        "@finos/perspective-react": false,
      };
    }

    // If you ever import .wasm/.arrow via ?url, enable these:
    config.experiments = config.experiments || {};
    config.experiments.asyncWebAssembly = true;
    // (Optional) .arrow files as assets
    // config.module.rules.push({
    //   test: /\.arrow$/i,
    //   type: "asset/resource",
    //   generator: { filename: "static/data/[name][ext]" },
    // });

    return config;
  },
};

export default nextConfig;