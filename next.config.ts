import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@node-rs/argon2", "@prisma/client", "prisma", "sharp"],
  // Vercel's file trace drops sharp's native binary. Uploads need the Linux build.
  outputFileTracingIncludes: {
    "/api/admin/media": [
      "./node_modules/sharp/**/*",
      "./node_modules/@img/sharp-linux-x64/**/*",
      "./node_modules/@img/sharp-libvips-linux-x64/**/*",
      "./node_modules/.pnpm/sharp@*/node_modules/sharp/**/*",
      "./node_modules/.pnpm/sharp@*/node_modules/@img/sharp-linux-x64/**/*",
      "./node_modules/.pnpm/sharp@*/node_modules/@img/sharp-libvips-linux-x64/**/*",
      "./node_modules/.pnpm/@img+sharp-linux-x64@*/node_modules/@img/sharp-linux-x64/**/*",
      "./node_modules/.pnpm/@img+sharp-libvips-linux-x64@*/node_modules/@img/sharp-libvips-linux-x64/**/*",
    ],
  },
};

export default nextConfig;
