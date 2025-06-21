import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  experimental: {
    serverActions: {}, // ✅ Must be an object, not a boolean
    allowedDevOrigins: [
      'https://9003-firebase-studio-1747070705076.cluster-axf5tvtfjjfekvhwxwkkkzsk2y.cloudworkstations.dev',
      'https://6000-firebase-studio-1747070705076.cluster-axf5tvtfjjfekvhwxwkkkzsk2y.cloudworkstations.dev',
    ],
  },
  // Removed i18n configuration block
};

export default nextConfig;
