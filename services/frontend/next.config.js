/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
    NEXT_PUBLIC_SERVER_WEBSOCKET_URL:
      process.env.NEXT_PUBLIC_SERVER_WEBSOCKET_URL,
  },
  reactStrictMode: true,
};

module.exports = nextConfig;
