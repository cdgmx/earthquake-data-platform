import { describe, expect, it, vi } from "vitest";
import { createQueryService, getDayBuckets } from "../query-service.js";
import type {
	QueryDayBucketParams,
	QueryDayBucketResult,
} from "../repository.js";
import type { CursorPayload, EarthquakeEvent } from "../schemas.js";

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
		function createServiceWithMock() {
			const queryDayBucket =
				vi.fn<
					(params: QueryDayBucketParams) => Promise<QueryDayBucketResult>
				>();
			const service = createQueryService({
				repository: { queryDayBucket },
			});
			return { service, queryDayBucket };
		}

		function createMockEvent(
			id: string,
			tsMs: number,
			dayBucket: string,
		): EarthquakeEvent {
			return {
				eventId: id,
				eventTsMs: tsMs,
				mag: 3.0,
				place: `Location ${id}`,
				lat: 35.0,
				lon: -118.0,
				depth: 10,
				entity: "EVENT",
				dayBucket,
				source: "USGS",
				ingestedAt: tsMs,
			};
		}

		describe("Inner Loop: Multiple Queries to Same Bucket", () => {
			it("should query same bucket multiple times until exhausted when page not full", async () => {
				const { service, queryDayBucket } = createServiceWithMock();

				queryDayBucket
					.mockResolvedValueOnce({
						items: [
							createMockEvent("evt1", 1760956800000, "20251020"),
							createMockEvent("evt2", 1760956700000, "20251020"),
						],
						lastEvaluatedKey: { pk: "EVENT#evt2", sk: "METADATA", gsi1pk: "DAY#20251020", gsi1sk: 1760956700000 },
					})
					.mockResolvedValueOnce({
						items: [
							createMockEvent("evt3", 1760956600000, "20251020"),
							createMockEvent("evt4", 1760956500000, "20251020"),
						],
						lastEvaluatedKey: { pk: "EVENT#evt4", sk: "METADATA", gsi1pk: "DAY#20251020", gsi1sk: 1760956500000 },
					})
					.mockResolvedValueOnce({
						items: [
							createMockEvent("evt5", 1760956400000, "20251020"),
						],
						lastEvaluatedKey: undefined,
					})
					.mockResolvedValue({
						items: [],
						lastEvaluatedKey: undefined,
					});

				const result = await service.executeQuery({
					starttime: 1760697600000,
					endtime: 1760956800000,
					minmagnitude: 2.0,
					pageSize: 10,
				});

				expect(result.items).toHaveLength(5);
				
				const calls = queryDayBucket.mock.calls;
				expect(calls[0][0].dayBucket).toBe("20251020");
				expect(calls[0][0].exclusiveStartKey).toBeUndefined();
				
				expect(calls[1][0].dayBucket).toBe("20251020");
				expect(calls[1][0].exclusiveStartKey).toEqual({ pk: "EVENT#evt2", sk: "METADATA", gsi1pk: "DAY#20251020", gsi1sk: 1760956700000 });
				
				expect(calls[2][0].dayBucket).toBe("20251020");
				expect(calls[2][0].exclusiveStartKey).toEqual({ pk: "EVENT#evt4", sk: "METADATA", gsi1pk: "DAY#20251020", gsi1sk: 1760956500000 });
				
				expect(calls.slice(0, 3).every(call => call[0].dayBucket === "20251020")).toBe(true);
			});

			it("should stop querying same bucket when page is full even if lastEvaluatedKey exists", async () => {
				const { service, queryDayBucket } = createServiceWithMock();

				queryDayBucket
					.mockResolvedValueOnce({
						items: Array.from({ length: 5 }, (_, i) =>
							createMockEvent(`evt${i + 1}`, 1760956800000 - i * 1000, "20251020"),
						),
						lastEvaluatedKey: { pk: "EVENT#evt5", sk: "METADATA", gsi1pk: "DAY#20251020", gsi1sk: 1760956795000 },
					})
					.mockResolvedValueOnce({
						items: Array.from({ length: 5 }, (_, i) =>
							createMockEvent(`evt${i + 6}`, 1760956794000 - i * 1000, "20251020"),
						),
						lastEvaluatedKey: { pk: "EVENT#evt10", sk: "METADATA", gsi1pk: "DAY#20251020", gsi1sk: 1760956790000 },
					});

				const result = await service.executeQuery({
					starttime: 1760697600000,
					endtime: 1760956800000,
					minmagnitude: 2.0,
					pageSize: 10,
				});

				expect(result.items).toHaveLength(10);
				expect(queryDayBucket).toHaveBeenCalledTimes(2);
				expect(result.nextCursor).toBeDefined();
				expect(result.nextCursor?.idx).toBe(0);
				expect(result.nextCursor?.lek).toEqual({ pk: "EVENT#evt10", sk: "METADATA", gsi1pk: "DAY#20251020", gsi1sk: 1760956790000 });
			});
		});

		describe("Edge Case: Bucket Exhaustion with Cursor Advancement", () => {
			it("should advance to next bucket when current exhausted but pageSize not reached", async () => {
				const { service, queryDayBucket } = createServiceWithMock();

				queryDayBucket
					.mockResolvedValueOnce({
						items: [
							createMockEvent("evt1", 1760956800000, "20251020"),
							createMockEvent("evt2", 1760955000000, "20251020"),
							createMockEvent("evt3", 1760954000000, "20251020"),
						],
						lastEvaluatedKey: undefined,
					})
					.mockResolvedValueOnce({
						items: [
							createMockEvent("evt4", 1760870400000, "20251019"),
							createMockEvent("evt5", 1760869000000, "20251019"),
						],
						lastEvaluatedKey: undefined,
					})
					.mockResolvedValueOnce({
						items: [createMockEvent("evt6", 1760784000000, "20251018")],
						lastEvaluatedKey: undefined,
					})
					.mockResolvedValueOnce({
						items: [],
						lastEvaluatedKey: undefined,
					});

				const result = await service.executeQuery({
					starttime: 1760697600000,
					endtime: 1760956800000,
					minmagnitude: 2.0,
					pageSize: 10,
				});

				expect(result.items).toHaveLength(6);
				expect(queryDayBucket).toHaveBeenCalledTimes(4);
				expect(result.nextCursor).toBeUndefined();
			});

			it("should NOT advance when current bucket exhausted on LAST bucket", async () => {
				const { service, queryDayBucket } = createServiceWithMock();

				queryDayBucket.mockResolvedValueOnce({
					items: [
						createMockEvent("evt1", 1760697600000, "20251017"),
						createMockEvent("evt2", 1760698000000, "20251017"),
					],
					lastEvaluatedKey: undefined,
				});

				const cursor: CursorPayload = {
					v: 1,
					st: 1760697600000,
					et: 1760956800000,
					mm: 2.0,
					ps: 10,
					buckets: ["20251020", "20251019", "20251018", "20251017"],
					idx: 3,
				};

				const result = await service.executeQuery({
					starttime: 1760697600000,
					endtime: 1760956800000,
					minmagnitude: 2.0,
					pageSize: 10,
					cursor,
				});

				expect(result.items).toHaveLength(2);
				expect(result.nextCursor).toBeUndefined();
			});
		});

		describe("Edge Case: Data Distinctness Across Pages", () => {
			it("should return different items on page 2 than page 1", async () => {
				const { service, queryDayBucket } = createServiceWithMock();

				const page1Items = [
					createMockEvent("evt1", 1760956800000, "20251020"),
					createMockEvent("evt2", 1760955000000, "20251020"),
				];

				const page2Items = [
					createMockEvent("evt3", 1760870400000, "20251019"),
					createMockEvent("evt4", 1760869000000, "20251019"),
				];

				queryDayBucket
					.mockResolvedValueOnce({
						items: page1Items,
						lastEvaluatedKey: undefined,
					})
					.mockResolvedValueOnce({
						items: page2Items,
						lastEvaluatedKey: undefined,
					});

				const page1Result = await service.executeQuery({
					starttime: 1760697600000,
					endtime: 1760956800000,
					minmagnitude: 2.0,
					pageSize: 2,
				});

				const page2Result = await service.executeQuery({
					starttime: 1760697600000,
					endtime: 1760956800000,
					minmagnitude: 2.0,
					pageSize: 2,
					cursor: page1Result.nextCursor,
				});

				const page1Ids = page1Result.items.map((i) => i.eventId);
				const page2Ids = page2Result.items.map((i) => i.eventId);

				expect(page1Ids).toEqual(["evt1", "evt2"]);
				expect(page2Ids).toEqual(["evt3", "evt4"]);
				expect(page1Ids.some((id) => page2Ids.includes(id))).toBe(false);
			});
		});

		describe("Edge Case: Bucket Iteration Order (Newest→Oldest)", () => {
			it("should query buckets in reverse chronological order", async () => {
				const { service, queryDayBucket } = createServiceWithMock();

				queryDayBucket.mockResolvedValue({
					items: [],
					lastEvaluatedKey: undefined,
				});

				await service.executeQuery({
					starttime: 1760697600000,
					endtime: 1760956800000,
					minmagnitude: 2.0,
					pageSize: 10,
				});

				const dayBucketsQueried = queryDayBucket.mock.calls.map(
					(call) => call[0].dayBucket,
				);

				expect(dayBucketsQueried[0]).toBe("20251020");
				expect(dayBucketsQueried[1]).toBe("20251019");
				expect(dayBucketsQueried[2]).toBe("20251018");
				expect(dayBucketsQueried[3]).toBe("20251017");
			});

			it("should return events with timestamps in descending order across buckets", async () => {
				const { service, queryDayBucket } = createServiceWithMock();

				queryDayBucket
					.mockResolvedValueOnce({
						items: [createMockEvent("evt1", 1760956800000, "20251020")],
						lastEvaluatedKey: undefined,
					})
					.mockResolvedValueOnce({
						items: [createMockEvent("evt2", 1760870400000, "20251019")],
						lastEvaluatedKey: undefined,
					})
					.mockResolvedValueOnce({
						items: [createMockEvent("evt3", 1760784000000, "20251018")],
						lastEvaluatedKey: undefined,
					})
					.mockResolvedValueOnce({
						items: [],
						lastEvaluatedKey: undefined,
					});

				const result = await service.executeQuery({
					starttime: 1760697600000,
					endtime: 1760956800000,
					minmagnitude: 2.0,
					pageSize: 10,
				});

				const timestamps = result.items.map((i) => i.eventTsMs);
				expect(timestamps).toEqual([1760956800000, 1760870400000, 1760784000000]);
				expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
			});
		});

		describe("Edge Case: LastEvaluatedKey Continuation", () => {
			it("should generate cursor with lek when DynamoDB pagination continues", async () => {
				const { service, queryDayBucket } = createServiceWithMock();

				queryDayBucket.mockResolvedValue({
					items: Array.from({ length: 10 }, (_, i) =>
						createMockEvent(`evt${i}`, 1760956800000 - i * 1000, "20251020"),
					),
					lastEvaluatedKey: {
						pk: "EVENT#evt9",
						sk: "METADATA",
						gsi1pk: "DAY#20251020",
						gsi1sk: 1760956791000,
					},
				});

				const result = await service.executeQuery({
					starttime: 1760697600000,
					endtime: 1760956800000,
					minmagnitude: 2.0,
					pageSize: 10,
				});

				expect(result.nextCursor).toBeDefined();
				expect(result.nextCursor?.idx).toBe(0);
				expect(result.nextCursor?.lek).toEqual({
					pk: "EVENT#evt9",
					sk: "METADATA",
					gsi1pk: "DAY#20251020",
					gsi1sk: 1760956791000,
				});
			});

			it("should resume from lek within same bucket", async () => {
				const { service, queryDayBucket } = createServiceWithMock();

				queryDayBucket.mockResolvedValue({
					items: [createMockEvent("evt10", 1760956790000, "20251020")],
					lastEvaluatedKey: undefined,
				});

				const cursor: CursorPayload = {
					v: 1,
					st: 1760697600000,
					et: 1760956800000,
					mm: 2.0,
					ps: 10,
					buckets: ["20251020", "20251019", "20251018", "20251017"],
					idx: 0,
					lek: {
						pk: "EVENT#evt9",
						sk: "METADATA",
						gsi1pk: "DAY#20251020",
						gsi1sk: 1760956791000,
					},
				};

				await service.executeQuery({
					starttime: 1760697600000,
					endtime: 1760956800000,
					minmagnitude: 2.0,
					pageSize: 10,
					cursor,
				});

				const firstCallArgs = queryDayBucket.mock.calls[0][0];
				expect(firstCallArgs.dayBucket).toBe("20251020");
				expect(firstCallArgs.exclusiveStartKey).toEqual(cursor.lek);
			});
		});

		describe("Edge Case: Final Page Detection", () => {
			it("should omit cursor when all buckets exhausted and items < pageSize", async () => {
				const { service, queryDayBucket } = createServiceWithMock();

				queryDayBucket
					.mockResolvedValueOnce({
						items: [createMockEvent("evt1", 1760697600000, "20251017")],
						lastEvaluatedKey: undefined,
					})
					.mockResolvedValueOnce({
						items: [],
						lastEvaluatedKey: undefined,
					});

				const result = await service.executeQuery({
					starttime: 1760697600000,
					endtime: 1760784000000,
					minmagnitude: 2.0,
					pageSize: 100,
				});

				expect(result.items).toHaveLength(1);
				expect(result.nextCursor).toBeUndefined();
			});
		});
	});
});
