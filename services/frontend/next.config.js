/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    SERVER_URL: process.env.SERVER_URL,
    SERVER_WEBSOCKET_URL: process.env.SERVER_WEBSOCKET_URL,
  },
};

module.exports = nextConfig;
