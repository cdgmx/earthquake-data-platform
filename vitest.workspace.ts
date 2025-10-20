import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
	"apps/web/vitest.config.mts",
	"packages/services/*/vitest.config.ts",
	"packages/env/vitest.config.ts",
	"packages/utils/vitest.config.ts",
]);
