import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@node-rs/argon2", "@prisma/client", "prisma"],
};

export default nextConfig;
