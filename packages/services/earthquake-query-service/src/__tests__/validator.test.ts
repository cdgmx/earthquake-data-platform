import { describe, expect, it } from "vitest";
import { parseTimestamp, validateQueryParams } from "../validator.js";

describe("validator", () => {
	describe("parseTimestamp", () => {
		it("should parse ISO-8601 string to epoch ms", () => {
			const result = parseTimestamp("2025-10-15T00:00:00Z");
			expect(result).toBe(new Date("2025-10-15T00:00:00Z").getTime());
		});

		it("should return epoch ms as-is", () => {
			const timestamp = 1729036800000;
			const result = parseTimestamp(timestamp);
			expect(result).toBe(timestamp);
		});
	});

	describe("validateQueryParams", () => {
		it("should accept valid ISO-8601 timestamps", () => {
			const result = validateQueryParams({
				starttime: "2025-10-15T00:00:00Z",
				endtime: "2025-10-18T23:59:59Z",
				minmagnitude: 3.0,
			});

			expect(result.starttime).toBe(new Date("2025-10-15T00:00:00Z").getTime());
			expect(result.endtime).toBe(new Date("2025-10-18T23:59:59Z").getTime());
			expect(result.minmagnitude).toBe(3.0);
			expect(result.pageSize).toBe(50);
		});

		it("should accept valid epoch ms timestamps", () => {
			const result = validateQueryParams({
				starttime: 1729036800000,
				endtime: 1729296000000,
				minmagnitude: 5.0,
			});

			expect(result.starttime).toBe(1729036800000);
			expect(result.endtime).toBe(1729296000000);
			expect(result.minmagnitude).toBe(5.0);
		});

		it("should apply default pageSize of 50", () => {
			const result = validateQueryParams({
				starttime: "2025-10-15T00:00:00Z",
				endtime: "2025-10-16T00:00:00Z",
				minmagnitude: 3.0,
			});

			expect(result.pageSize).toBe(50);
		});

		it("should accept custom pageSize within range", () => {
			const result = validateQueryParams({
				starttime: "2025-10-15T00:00:00Z",
				endtime: "2025-10-16T00:00:00Z",
				minmagnitude: 3.0,
				pageSize: 25,
			});

			expect(result.pageSize).toBe(25);
		});

		it("should reject endtime before starttime", () => {
			expect(() =>
				validateQueryParams({
					starttime: "2025-10-18T00:00:00Z",
					endtime: "2025-10-15T00:00:00Z",
					minmagnitude: 3.0,
				}),
			).toThrow();
		});

		it("should reject query window > 365 days", () => {
			expect(() =>
				validateQueryParams({
					starttime: "2024-01-01T00:00:00Z",
					endtime: "2025-12-31T00:00:00Z",
					minmagnitude: 3.0,
				}),
			).toThrow();
		});

		it("should reject invalid ISO-8601 format", () => {
			expect(() =>
				validateQueryParams({
					starttime: "not-a-date",
					endtime: "2025-10-15T00:00:00Z",
					minmagnitude: 3.0,
				}),
			).toThrow();
		});

		it("should reject negative minmagnitude", () => {
			expect(() =>
				validateQueryParams({
					starttime: "2025-10-15T00:00:00Z",
					endtime: "2025-10-16T00:00:00Z",
					minmagnitude: -3.0,
				}),
			).toThrow();
		});

		it("should reject pageSize < 1", () => {
			expect(() =>
				validateQueryParams({
					starttime: "2025-10-15T00:00:00Z",
					endtime: "2025-10-16T00:00:00Z",
					minmagnitude: 3.0,
					pageSize: 0,
				}),
			).toThrow();
		});

		it("should reject pageSize > 100", () => {
			expect(() =>
				validateQueryParams({
					starttime: "2025-10-15T00:00:00Z",
					endtime: "2025-10-16T00:00:00Z",
					minmagnitude: 3.0,
					pageSize: 150,
				}),
			).toThrow();
		});

		it("should accept minmagnitude in valid range [-2.0, 10.0]", () => {
			const result1 = validateQueryParams({
				starttime: "2025-10-15T00:00:00Z",
				endtime: "2025-10-16T00:00:00Z",
				minmagnitude: -2.0,
			});
			expect(result1.minmagnitude).toBe(-2.0);

			const result2 = validateQueryParams({
				starttime: "2025-10-15T00:00:00Z",
				endtime: "2025-10-16T00:00:00Z",
				minmagnitude: 10.0,
			});
			expect(result2.minmagnitude).toBe(10.0);
		});
	});
});
