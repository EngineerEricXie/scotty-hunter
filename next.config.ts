import type { NextConfig } from "next";

const staticExport = process.env.STATIC_EXPORT === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? (staticExport ? "/scotty-hunter" : "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_STATIC_DEMO: staticExport ? "true" : "false",
  },
  ...(staticExport ? {
    output: "export",
    trailingSlash: true,
    images: { unoptimized: true },
  } : {}),
};

export default nextConfig;
