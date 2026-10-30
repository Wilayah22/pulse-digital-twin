import type { NextConfig } from "next";

// Pulse runs entirely in the browser (simulation engine + Open-Meteo), so it ships as a static site.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
