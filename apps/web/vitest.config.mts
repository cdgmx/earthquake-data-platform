import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react(), tsconfigPaths()],
	test: {
		environment: "jsdom",
		setupFiles: ["./vitest.setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html", "lcov", "clover"],
			exclude: [
				"node_modules/",
				"vitest.config.ts",
				"vitest.setup.ts",
				"**/*.config.{js,ts}",
				"**/*.d.ts",
			],
		},
	},
});
