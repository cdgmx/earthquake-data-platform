import { describe, expect, it } from "vitest";
import { QueryParamsSchema } from "../schemas.js";

describe("handler", () => {
	describe("query parameter validation", () => {
		it("rejects missing day parameter", () => {
			const result = QueryParamsSchema.safeParse({});

			expect(result.success).toBe(false);
		});

		it("rejects invalid day format", () => {
			const result = QueryParamsSchema.safeParse({ day: "invalid" });

			expect(result.success).toBe(false);
		});

		it("rejects windowDays exceeding max", () => {
			const result = QueryParamsSchema.safeParse({
				day: "2024-10-21",
				windowDays: "8",
			});

			expect(result.success).toBe(false);
		});

		it("rejects limit exceeding max", () => {
			const result = QueryParamsSchema.safeParse({
				day: "2024-10-21",
				limit: "51",
			});

			expect(result.success).toBe(false);
		});

		it("applies default values for optional parameters", () => {
			const result = QueryParamsSchema.parse({ day: "2024-10-21" });

			expect(result.windowDays).toBe(1);
			expect(result.limit).toBe(10);
		});

		it("accepts valid parameters", () => {
			const result = QueryParamsSchema.safeParse({
				day: "2024-10-21",
				windowDays: "3",
				limit: "20",
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.windowDays).toBe(3);
				expect(result.data.limit).toBe(20);
			}
		});
	});
});
