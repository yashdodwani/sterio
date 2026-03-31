import type { NextConfig } from "next";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'https://steriogent-backend-dev.up.railway.app';

const PAYMENT_BACKEND = 'https://ecommercescrapingbackend-dev.up.railway.app';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/payment/:path*',
        destination: `${PAYMENT_BACKEND}/api/payment/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${BACKEND}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
