/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
    NEXT_PUBLIC_SERVER_WEBSOCKET_URL:
      process.env.NEXT_PUBLIC_SERVER_WEBSOCKET_URL,
  },
  reactStrictMode: false,
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 15 * 60 * 1000, // 15 minutes
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 4,
  },
  experimental: {
    reactCompiler: true,
  },
};

module.exports = nextConfig;
