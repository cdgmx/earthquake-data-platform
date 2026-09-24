import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
	root: fileURLToPath(new URL(".", import.meta.url)),
	test: {
		projects: [
			"apps/web/vitest.config.mts",
			"packages/services/*/vitest.config.ts",
			"packages/env/vitest.config.ts",
			"packages/utils/vitest.config.ts",
			"packages/libs/errors/vitest.config.ts",
		],
	},
});
