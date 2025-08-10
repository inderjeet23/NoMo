import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Externalize heavy server-only deps so the bundler doesn't try to resolve internal files
  serverExternalPackages: ["firebase-admin", "@google-cloud/firestore"],
};

export default nextConfig;
