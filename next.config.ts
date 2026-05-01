import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  ...(process.env.NODE_ENV === 'production' && { output: 'standalone' }),
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS?.split(',').map((s) =>
    s.trim(),
  ) ?? ['localhost'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/avatars/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
};

export default nextConfig;
