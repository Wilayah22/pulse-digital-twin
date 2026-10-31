import type { NextConfig } from "next";

// Pulse runs entirely in the browser (simulation engine + Open-Meteo), so it ships as a static site.
const nextConfig: NextConfig = {
  output: "export",
  // Emit /simulator/index.html so every static host serves /simulator/ without rewrites.
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
