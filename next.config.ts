import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    // The old in-app analysis page was replaced by /research/[id].
    return [{ source: '/analysis', destination: '/', permanent: true }];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  // Turbopack filesystem caching is enabled by default in Next.js 16.1+
  // This provides 5-14× faster cold starts
  experimental: {
    // Enable if you want to customize turbopack caching (default: true)
    // turbopackFileSystemCache: true,
  },
};

export default nextConfig;
