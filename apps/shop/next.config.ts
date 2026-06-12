import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@grocery/ui", "@grocery/db", "@grocery/shared"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default nextConfig;
