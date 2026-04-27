import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['192.168.32.100'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/avatars/**',
      },
    ],
  },
  experimental: {
    staleTimes: {
      dynamic: 300,
    },
  },
  // 显式使用 webpack 而非 Turbopack (Next.js 16 默认 Turbopack 有 chunk 加载 bug)
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;
