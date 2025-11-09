/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone', // Enable standalone output for Docker
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  },
  // Note: Rewrites are optional and only used if API is on different domain
  // For production, configure NEXT_PUBLIC_API_URL to point to your API domain
};

module.exports = nextConfig;
