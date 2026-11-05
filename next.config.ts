import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  deprecated: { looseRouteMatching: true },
  /* config options here */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
