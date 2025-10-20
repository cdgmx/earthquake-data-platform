import { describe, expect, it } from "vitest";
import { AppError, ERROR_CODES } from "../index.js";

describe("AppError", () => {
	it("should create an AppError with all properties", () => {
		const error = new AppError({
			code: ERROR_CODES.USGS_UNAVAILABLE,
			message: "USGS API is down",
			httpStatus: 503,
			cause: new Error("Network timeout"),
		});

		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(AppError);
		expect(error.name).toBe("AppError");
		expect(error.code).toBe(ERROR_CODES.USGS_UNAVAILABLE);
		expect(error.message).toBe("USGS API is down");
		expect(error.httpStatus).toBe(503);
		expect(error.cause).toBeInstanceOf(Error);
	});

	it("should create an AppError without optional fields", () => {
		const error = new AppError({
			code: ERROR_CODES.VALIDATION_ERROR,
			message: "Invalid input",
			httpStatus: 400,
		});

		expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
		expect(error.message).toBe("Invalid input");
		expect(error.httpStatus).toBe(400);
		expect(error.cause).toBeUndefined();
	});

	it("should serialize to JSON with all fields", () => {
		const error = new AppError({
			code: ERROR_CODES.DATABASE_UNAVAILABLE,
			message: "DynamoDB query failed",
			httpStatus: 503,
			cause: new Error("Timeout"),
		});

		const json = error.toJSON();

		expect(json).toEqual({
			name: "AppError",
			code: ERROR_CODES.DATABASE_UNAVAILABLE,
			message: "DynamoDB query failed",
			httpStatus: 503,
		});
	});

	it("should serialize to JSON without optional fields", () => {
		const error = new AppError({
			code: ERROR_CODES.INTERNAL,
			message: "Unexpected error",
			httpStatus: 500,
		});

		const json = error.toJSON();

		expect(json).toEqual({
			name: "AppError",
			code: ERROR_CODES.INTERNAL,
			message: "Unexpected error",
			httpStatus: 500,
		});
	});

	it("should preserve stack trace", () => {
		const error = new AppError({
			code: ERROR_CODES.INTERNAL,
			message: "Test error",
			httpStatus: 500,
		});

		expect(error.stack).toBeDefined();
		expect(error.stack).toContain("AppError");
	});

	it("should support instanceof checks", () => {
		const error = new AppError({
			code: ERROR_CODES.VALIDATION_ERROR,
			message: "Invalid input",
			httpStatus: 400,
		});

		expect(error instanceof AppError).toBe(true);
		expect(error instanceof Error).toBe(true);
	});
});

describe("ERROR_CODES", () => {
	it("should export all expected error codes", () => {
		expect(ERROR_CODES.INTERNAL).toBe("INTERNAL");
		expect(ERROR_CODES.VALIDATION_ERROR).toBe("VALIDATION_ERROR");
		expect(ERROR_CODES.INFRASTRUCTURE_NOT_READY).toBe(
			"INFRASTRUCTURE_NOT_READY",
		);
		expect(ERROR_CODES.DATABASE_UNAVAILABLE).toBe("DATABASE_UNAVAILABLE");
		expect(ERROR_CODES.USGS_UNAVAILABLE).toBe("USGS_UNAVAILABLE");
		expect(ERROR_CODES.USGS_PARSE_ERROR).toBe("USGS_PARSE_ERROR");
	});

	it("should be a const object", () => {
		const keys = Object.keys(ERROR_CODES);
		expect(keys).toContain("INTERNAL");
		expect(keys).toContain("VALIDATION_ERROR");
		expect(keys).toContain("DATABASE_UNAVAILABLE");
	});
});
