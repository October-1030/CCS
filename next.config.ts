import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable build cache to ensure fresh data
  experimental: {
    webpackBuildWorker: false,
  },
  // Generate unique build ID to force cache invalidation
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
};

export default nextConfig;
