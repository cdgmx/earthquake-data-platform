import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { UserConfigExport } from "vitest/config";

const rootDirectory = fileURLToPath(new URL(".", import.meta.url));

/**
 * Shared Vitest configuration for Lambda service packages.
 * Provides common aliases and test environment setup.
 */
export function createServiceVitestConfig(): UserConfigExport {
	return {
		resolve: {
			alias: {
				"@earthquake/utils": resolve(
					rootDirectory,
					"packages/utils/src/index.ts",
				),
				"@earthquake/utils/logger": resolve(
					rootDirectory,
					"packages/utils/src/logger.ts",
				),
			},
		},
		test: {
			globals: true,
			environment: "node",
			setupFiles: [resolve(rootDirectory, "vitest.setup.services.ts")],
			server: {
				deps: {
					inline: ["@earthquake/utils"],
				},
			},
			coverage: {
				provider: "v8",
				reporter: ["text", "json", "html"],
				exclude: ["node_modules/", "dist/", "**/*.test.ts"],
			},
		},
	};
}
