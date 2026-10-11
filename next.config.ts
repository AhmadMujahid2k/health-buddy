import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Phone access is OFF for now (server binds to 127.0.0.1 in package.json).
  // To use it from the iPhone on home Wi-Fi again: bind to 0.0.0.0 and uncomment:
  // allowedDevOrigins: ["<your-laptop-ip>", "*.local"],
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
