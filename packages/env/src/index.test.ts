import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { getRuntimeEnv } from "./index.js";

const TestEnvSchema = z.object({
	NODE_ENV: z.string().optional(),
	AWS_REGION: z.string().optional(),
	TABLE_NAME: z.string().min(1, "TABLE_NAME is required"),
	NEXT_TOKEN_SECRET: z
		.string()
		.min(16, "NEXT_TOKEN_SECRET must be at least 16 characters")
		.optional(),
	USGS_API_URL: z.string().url("USGS_API_URL must be a valid URL").optional(),
	ENABLE_USAGE_PLAN: z
		.string()
		.optional()
		.transform((val) => val === "true"),
});

describe("getRuntimeEnv", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv } as NodeJS.ProcessEnv;
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("should use AWS_REGION from Lambda runtime when available", () => {
		(process.env as Record<string, string>).NODE_ENV = "development";
		(process.env as Record<string, string>).AWS_REGION = "us-west-2";
		(process.env as Record<string, string>).TABLE_NAME = "test-table";
		(process.env as Record<string, string>).NEXT_TOKEN_SECRET =
			"test-secret-at-least-16-chars";

		const env = getRuntimeEnv(TestEnvSchema);

		expect(env.TABLE_NAME).toBe("test-table");
		expect(env.AWS_REGION).toBe("us-west-2");
	});

	it("should be undefined when AWS_REGION is not provided (Lambda runtime provides it)", () => {
		(process.env as Record<string, string>).NODE_ENV = "development";
		(process.env as Record<string, string>).TABLE_NAME = "test-table";
		(process.env as Record<string, string>).NEXT_TOKEN_SECRET =
			"test-secret-at-least-16-chars";
		delete process.env.AWS_REGION;

		const env = getRuntimeEnv(TestEnvSchema);

		expect(env.TABLE_NAME).toBe("test-table");
		expect(env.AWS_REGION).toBeUndefined();
	});

	it("should throw when TABLE_NAME is missing", () => {
		(process.env as Record<string, string>).NODE_ENV = "development";
		(process.env as Record<string, string>).AWS_REGION = "us-east-1";
		(process.env as Record<string, string>).NEXT_TOKEN_SECRET =
			"test-secret-at-least-16-chars";
		delete process.env.TABLE_NAME;

		expect(() => getRuntimeEnv(TestEnvSchema)).toThrow(/TABLE_NAME/);
	});

	it("should allow NEXT_TOKEN_SECRET to be undefined", () => {
		(process.env as Record<string, string>).NODE_ENV = "development";
		(process.env as Record<string, string>).AWS_REGION = "us-east-1";
		(process.env as Record<string, string>).TABLE_NAME = "test-table";
		delete process.env.NEXT_TOKEN_SECRET;

		const env = getRuntimeEnv(TestEnvSchema);

		expect(env.NEXT_TOKEN_SECRET).toBeUndefined();
	});

	it("should throw when NEXT_TOKEN_SECRET is too short", () => {
		(process.env as Record<string, string>).NODE_ENV = "development";
		(process.env as Record<string, string>).AWS_REGION = "us-east-1";
		(process.env as Record<string, string>).TABLE_NAME = "test-table";
		(process.env as Record<string, string>).NEXT_TOKEN_SECRET = "short";

		expect(() => getRuntimeEnv(TestEnvSchema)).toThrow(
			/at least 16 characters/,
		);
	});

	it("should use custom USGS_API_URL when provided", () => {
		(process.env as Record<string, string>).NODE_ENV = "development";
		(process.env as Record<string, string>).AWS_REGION = "us-east-1";
		(process.env as Record<string, string>).TABLE_NAME = "test-table";
		(process.env as Record<string, string>).NEXT_TOKEN_SECRET =
			"test-secret-at-least-16-chars";
		(process.env as Record<string, string>).USGS_API_URL =
			"https://custom.api.url";

		const env = getRuntimeEnv(TestEnvSchema);

		expect(env.USGS_API_URL).toBe("https://custom.api.url");
	});

	it("should throw when USGS_API_URL is not a valid URL", () => {
		(process.env as Record<string, string>).NODE_ENV = "development";
		(process.env as Record<string, string>).AWS_REGION = "us-east-1";
		(process.env as Record<string, string>).TABLE_NAME = "test-table";
		(process.env as Record<string, string>).NEXT_TOKEN_SECRET =
			"test-secret-at-least-16-chars";
		(process.env as Record<string, string>).USGS_API_URL = "not-a-url";

		expect(() => getRuntimeEnv(TestEnvSchema)).toThrow(/must be a valid URL/);
	});

	it("should parse ENABLE_USAGE_PLAN as boolean", () => {
		(process.env as Record<string, string>).NODE_ENV = "development";
		(process.env as Record<string, string>).AWS_REGION = "us-east-1";
		(process.env as Record<string, string>).TABLE_NAME = "test-table";
		(process.env as Record<string, string>).NEXT_TOKEN_SECRET =
			"test-secret-at-least-16-chars";
		(process.env as Record<string, string>).ENABLE_USAGE_PLAN = "true";

		const env = getRuntimeEnv(TestEnvSchema);

		expect(env.ENABLE_USAGE_PLAN).toBe(true);
	});

	it("should return frozen object", () => {
		(process.env as Record<string, string>).NODE_ENV = "development";
		(process.env as Record<string, string>).AWS_REGION = "us-east-1";
		(process.env as Record<string, string>).TABLE_NAME = "test-table";
		(process.env as Record<string, string>).NEXT_TOKEN_SECRET =
			"test-secret-at-least-16-chars";

		const env = getRuntimeEnv(TestEnvSchema);

		expect(Object.isFrozen(env)).toBe(true);
	});
});
