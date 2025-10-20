import type { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { describe, expect, it, vi } from "vitest";
import { executeQuery, getDayBuckets } from "../query-service.js";
import type { CursorPayload, EarthquakeItem } from "../schemas.js";

describe("query-service", () => {
	describe("getDayBuckets", () => {
		it("should return single bucket for same-day query", () => {
			const start = new Date("2025-10-15T10:00:00Z").getTime();
			const end = new Date("2025-10-15T18:00:00Z").getTime();

			const result = getDayBuckets(start, end);

			expect(result).toEqual(["20251015"]);
		});

		it("should return multiple buckets for multi-day query", () => {
			const start = new Date("2025-10-15T00:00:00Z").getTime();
			const end = new Date("2025-10-17T23:59:59Z").getTime();

			const result = getDayBuckets(start, end);

			expect(result).toEqual(["20251015", "20251016", "20251017"]);
		});

		it("should handle month boundary", () => {
			const start = new Date("2025-10-30T00:00:00Z").getTime();
			const end = new Date("2025-11-02T00:00:00Z").getTime();

			const result = getDayBuckets(start, end);

			expect(result).toEqual(["20251030", "20251031", "20251101", "20251102"]);
		});

		it("should handle year boundary", () => {
			const start = new Date("2024-12-30T00:00:00Z").getTime();
			const end = new Date("2025-01-02T00:00:00Z").getTime();

			const result = getDayBuckets(start, end);

			expect(result).toEqual(["20241230", "20241231", "20250101", "20250102"]);
		});

		it("should pad month and day with zeros", () => {
			const start = new Date("2025-01-05T00:00:00Z").getTime();
			const end = new Date("2025-01-07T00:00:00Z").getTime();

			const result = getDayBuckets(start, end);

			expect(result).toEqual(["20250105", "20250106", "20250107"]);
		});

		it("should handle leap year", () => {
			const start = new Date("2024-02-28T00:00:00Z").getTime();
			const end = new Date("2024-03-01T00:00:00Z").getTime();

			const result = getDayBuckets(start, end);

			expect(result).toEqual(["20240228", "20240229", "20240301"]);
		});
	});

	describe("executeQuery pagination", () => {
		const mockClient = {} as DynamoDBClient;
		const tableName = "test-table";

		it("should generate nextToken when page size reached before all buckets scanned", async () => {
			const _queryDayBucket = await import("../repository.js").then(
				(m) => m.queryDayBucket,
			);
			const spy = vi.spyOn(await import("../repository.js"), "queryDayBucket");

			const mockItem1: EarthquakeItem = {
				eventId: "evt1",
				eventTsMs: 1729036800000,
				mag: 3.0,
				place: "Test Location",
				lat: 35.0,
				lon: -118.0,
				depth: 10,
			};

			spy.mockResolvedValue({
				items: [mockItem1],
				lastEvaluatedKey: undefined,
			});

			const result = await executeQuery({
				client: mockClient,
				tableName,
				starttime: 1729036800000,
				endtime: 1729296000000,
				minmagnitude: 2.0,
				pageSize: 1,
			});

			expect(result.items).toHaveLength(1);
			expect(result.nextCursor).toBeDefined();
			expect(result.nextCursor?.v).toBe(1);
			expect(result.nextCursor?.st).toBe(1729036800000);
			expect(result.nextCursor?.et).toBe(1729296000000);
			expect(result.nextCursor?.mm).toBe(2.0);
			expect(result.nextCursor?.ps).toBe(1);
			expect(result.nextCursor?.idx).toBeGreaterThanOrEqual(0);

			spy.mockRestore();
		});

		it("should generate nextToken when DynamoDB returns LastEvaluatedKey", async () => {
			const spy = vi.spyOn(await import("../repository.js"), "queryDayBucket");

			const mockItems: EarthquakeItem[] = Array.from(
				{ length: 50 },
				(_, i) => ({
					eventId: `evt${i}`,
					eventTsMs: 1729036800000 + i * 1000,
					mag: 3.0,
					place: "Test Location",
					lat: 35.0,
					lon: -118.0,
					depth: 10,
				}),
			);

			spy.mockResolvedValue({
				items: mockItems,
				lastEvaluatedKey: {
					pk: "EVENT#evt49",
					sk: "METADATA",
					gsi1pk: "DAY#20251016",
					gsi1sk: 1729036849000,
				},
			});

			const result = await executeQuery({
				client: mockClient,
				tableName,
				starttime: 1729036800000,
				endtime: 1729123200000,
				minmagnitude: 2.0,
				pageSize: 50,
			});

			expect(result.items).toHaveLength(50);
			expect(result.nextCursor).toBeDefined();
			expect(result.nextCursor?.lek).toBeDefined();
			expect(result.nextCursor?.lek?.pk).toBe("EVENT#evt49");

			spy.mockRestore();
		});

		it("should omit nextToken on final page when all buckets exhausted", async () => {
			const spy = vi.spyOn(await import("../repository.js"), "queryDayBucket");

			const mockItem: EarthquakeItem = {
				eventId: "evt1",
				eventTsMs: 1729036800000,
				mag: 3.0,
				place: "Test Location",
				lat: 35.0,
				lon: -118.0,
				depth: 10,
			};

			spy.mockResolvedValue({
				items: [mockItem],
				lastEvaluatedKey: undefined,
			});

			const result = await executeQuery({
				client: mockClient,
				tableName,
				starttime: 1729036800000,
				endtime: 1729123200000,
				minmagnitude: 2.0,
				pageSize: 100,
			});

			expect(result.items.length).toBeLessThan(100);
			expect(result.nextCursor).toBeUndefined();

			spy.mockRestore();
		});

		it("should resume from cursor with bucket index", async () => {
			const spy = vi.spyOn(await import("../repository.js"), "queryDayBucket");

			const mockItem: EarthquakeItem = {
				eventId: "evt2",
				eventTsMs: 1729123200000,
				mag: 4.0,
				place: "Test Location 2",
				lat: 36.0,
				lon: -119.0,
				depth: 15,
			};

			spy.mockResolvedValue({
				items: [mockItem],
				lastEvaluatedKey: undefined,
			});

			const cursor: CursorPayload = {
				v: 1,
				st: 1729036800000,
				et: 1729296000000,
				mm: 2.0,
				ps: 50,
				buckets: ["20251016", "20251017", "20251018"],
				idx: 1,
			};

			const _result = await executeQuery({
				client: mockClient,
				tableName,
				starttime: 1729036800000,
				endtime: 1729296000000,
				minmagnitude: 2.0,
				pageSize: 50,
				cursor,
			});
			expect(spy).toHaveBeenCalled();
			const firstCallArgs = spy.mock.calls[0][0];
			expect(firstCallArgs.dayBucket).toBe("20251017");

			spy.mockRestore();
		});

		it("should resume from cursor with LastEvaluatedKey", async () => {
			const spy = vi.spyOn(await import("../repository.js"), "queryDayBucket");

			const mockItem: EarthquakeItem = {
				eventId: "evt51",
				eventTsMs: 1729123250000,
				mag: 4.5,
				place: "Test Location 3",
				lat: 37.0,
				lon: -120.0,
				depth: 20,
			};

			spy.mockResolvedValue({
				items: [mockItem],
				lastEvaluatedKey: undefined,
			});

			const cursor: CursorPayload = {
				v: 1,
				st: 1729036800000,
				et: 1729296000000,
				mm: 2.0,
				ps: 50,
				buckets: ["20251016", "20251017"],
				idx: 0,
				lek: {
					pk: "EVENT#evt50",
					sk: "METADATA",
					gsi1pk: "DAY#20251016",
					gsi1sk: 1729123200000,
				},
			};

			const _result = await executeQuery({
				client: mockClient,
				tableName,
				starttime: 1729036800000,
				endtime: 1729296000000,
				minmagnitude: 2.0,
				pageSize: 50,
				cursor,
			});
			expect(spy).toHaveBeenCalled();
			const firstCallArgs = spy.mock.calls[0][0];
			expect(firstCallArgs.exclusiveStartKey).toEqual(cursor.lek);

			spy.mockRestore();
		});
	});
});
