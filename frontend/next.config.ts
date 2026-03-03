/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      root: "./frontend", // Tell Turbopack where your app root is
    },
  },
};

module.exports = nextConfig;