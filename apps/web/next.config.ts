import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	transpilePackages: ["@earthquake/earthquakes"],
	output: "standalone",
};

export default nextConfig;
