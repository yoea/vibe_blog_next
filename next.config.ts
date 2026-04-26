import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
