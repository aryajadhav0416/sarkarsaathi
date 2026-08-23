import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Prevent Next.js from bundling Tesseract.js worker files incorrectly */
  serverExternalPackages: ['tesseract.js'],
};

export default nextConfig;
