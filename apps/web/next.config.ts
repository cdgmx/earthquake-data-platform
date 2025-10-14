import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	transpilePackages: ["@earthquake/ui", "@earthquake/earthquakes"],
};

export default nextConfig;
