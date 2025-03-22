/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
    NEXT_PUBLIC_ORDERBOOK_SERVER_WEBSOCKET_URL:
      process.env.NEXT_PUBLIC_ORDERBOOK_SERVER_WEBSOCKET_URL,
    NEXT_PUBLIC_BACKEND_SERVER_WEBSOCKET_URL:
      process.env.NEXT_PUBLIC_BACKEND_SERVER_WEBSOCKET_URL,
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
    turbo: {
      poll: 1000,
      aggregateTimeout: 300,
    },
  },
};

module.exports = nextConfig;
