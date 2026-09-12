const { initOpenNextCloudflareForDev } = require("@opennextjs/cloudflare");

/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = nextConfig;

if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}