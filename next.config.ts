import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@node-rs/argon2", "@prisma/client", "prisma", "sharp"],
  // Vercel's file trace drops sharp's libvips binary. Include the real pnpm
  // store directory only. The hoisted node_modules paths are symlinks, and
  // Vercel rejects a serverless package that contains those.
  outputFileTracingIncludes: {
    "/api/admin/media": [
      "./node_modules/.pnpm/@img+sharp-libvips-linux-x64@*/node_modules/@img/sharp-libvips-linux-x64/**/*",
    ],
  },
};

export default nextConfig;
