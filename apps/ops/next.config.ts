import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile workspace packages (they ship raw TS/TSX).
  transpilePackages: ["@grocery/ui", "@grocery/db", "@grocery/shared"],
  images: {
    // Allow Supabase Storage public/transform URLs.
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default nextConfig;
