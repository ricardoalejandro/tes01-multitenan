/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone', // Enable standalone output for Docker
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  },
  // Ignore ESLint warnings during production builds
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint warnings.
    ignoreDuringBuilds: true,
  },
  // Note: Rewrites are optional and only used if API is on different domain
  // For production, configure NEXT_PUBLIC_API_URL to point to your API domain
};

module.exports = nextConfig;
