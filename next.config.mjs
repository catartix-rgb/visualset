/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // R3F + audio/video streams behave better without double-invoke in dev
  transpilePackages: ["three"],
};

export default nextConfig;
