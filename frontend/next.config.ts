import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // Ignore typescript errors during build for hackathon speed validation
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignore lint errors during build
    ignoreDuringBuilds: true,
  }
};

export default nextConfig;
