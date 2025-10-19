import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { createVitestConfig } from "../../../vitest.config.base.js";

const currentDirectory = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(
	createVitestConfig({
		resolve: {
			alias: {
				"@earthquake/utils": resolve(
					currentDirectory,
					"../../utils/src/index.ts",
				),
			},
		},
		test: {
			server: {
				deps: {
					inline: ["@earthquake/utils"],
				},
			},
		},
	}),
);
