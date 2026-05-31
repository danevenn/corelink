import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Avatares demo servidos por i.pravatar.cc (ver prisma/seed.ts).
    // next/image exige declarar hosts remotos explícitamente.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
    ],
  },
};

export default nextConfig;
