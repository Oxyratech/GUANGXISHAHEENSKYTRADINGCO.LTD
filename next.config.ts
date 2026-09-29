import path from "node:path";
import type { NextConfig } from "next";

/**
 * next-intl needs `next-intl/config` to resolve to our request config. `createNextIntlPlugin` does
 * exactly this (plus optional message-extraction loaders we do not use), but it eagerly loads
 * @swc/core, which needlessly ties config loading to a native addon. Declaring the alias directly
 * keeps the config dependency-free and identical across Turbopack and webpack.
 */
const I18N_REQUEST_CONFIG = "./src/i18n/request.ts";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    // Inquiry attachments are validated to <= 5 MB; leave headroom for multipart overhead.
    serverActions: { bodySizeLimit: "8mb" },
  },
  turbopack: {
    resolveAlias: { "next-intl/config": I18N_REQUEST_CONFIG },
  },
  webpack(config) {
    config.resolve ??= {};
    config.resolve.alias ??= {};
    config.resolve.alias["next-intl/config"] = path.resolve(config.context, I18N_REQUEST_CONFIG);
    return config;
  },
};

export default nextConfig;
