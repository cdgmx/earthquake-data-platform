import type { UserConfigExport } from "vitest/config";

export function createVitestConfig(
	overrides: UserConfigExport = {},
): UserConfigExport {
	return {
		test: {
			globals: true,
			environment: "node",
			coverage: {
				provider: "v8",
				reporter: ["text", "json", "html"],
				exclude: ["node_modules/", "dist/", "**/*.test.ts", "**/*.test.tsx"],
			},
		},
		...overrides,
	};
}
