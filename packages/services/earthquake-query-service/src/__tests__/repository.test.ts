import type { DynamoDocClient } from "@earthquake/dynamo-client";
import { AppError } from "@earthquake/errors";
import { describe, expect, it, vi } from "vitest";
import { createRepository } from "../repository.js";

describe("repository", () => {
	describe("queryDayBucket", () => {
		it("should construct correct GSI query with KeyConditionExpression", async () => {
			const mockQuery = vi.fn().mockResolvedValue({
				Items: [
					{
						pk: "EQ#us6000abcd",
						sk: "METADATA",
						eventId: "us6000abcd",
						mag: 5.4,
						place: "Test Location",
						time: 1729353600000,
					},
				],
				LastEvaluatedKey: undefined,
			});

			const mockDocClient = {
				send: mockQuery,
			} as unknown as DynamoDocClient;

			const repository = createRepository({
				docClient: mockDocClient,
				tableName: "test-table",
			});

			await repository.queryDayBucket({
				dayBucket: "2024-10-19",
				startMs: 1729296000000,
				endMs: 1729382399999,
				minMagnitude: 2.5,
				limit: 10,
			});

			expect(mockQuery).toHaveBeenCalledWith(
				expect.objectContaining({
					input: expect.objectContaining({
						TableName: "test-table",
						IndexName: "TimeOrderedIndex",
						KeyConditionExpression:
							"gsi1pk = :pk AND gsi1sk BETWEEN :start AND :end",
						ExpressionAttributeValues: {
							":pk": "DAY#2024-10-19",
							":start": 1729296000000,
							":end": 1729382399999,
							":minMag": 2.5,
						},
					}),
				}),
			);
		});

		it("should apply magnitude FilterExpression", async () => {
			const mockQuery = vi.fn().mockResolvedValue({
				Items: [],
				LastEvaluatedKey: undefined,
			});

			const mockDocClient = {
				send: mockQuery,
			} as unknown as DynamoDocClient;

			const repository = createRepository({
				docClient: mockDocClient,
				tableName: "test-table",
			});

			await repository.queryDayBucket({
				dayBucket: "2024-10-19",
				startMs: 1729296000000,
				endMs: 1729382399999,
				minMagnitude: 4.0,
				limit: 10,
			});

			expect(mockQuery).toHaveBeenCalledWith(
				expect.objectContaining({
					input: expect.objectContaining({
						FilterExpression: "mag >= :minMag",
						ExpressionAttributeValues: expect.objectContaining({
							":minMag": 4.0,
						}),
					}),
				}),
			);
		});

		it("should set ScanIndexForward=false for DESC ordering", async () => {
			const mockQuery = vi.fn().mockResolvedValue({
				Items: [],
				LastEvaluatedKey: undefined,
			});

			const mockDocClient = {
				send: mockQuery,
			} as unknown as DynamoDocClient;

			const repository = createRepository({
				docClient: mockDocClient,
				tableName: "test-table",
			});

			await repository.queryDayBucket({
				dayBucket: "2024-10-19",
				startMs: 1729296000000,
				endMs: 1729382399999,
				minMagnitude: 2.5,
				limit: 10,
			});

			expect(mockQuery).toHaveBeenCalledWith(
				expect.objectContaining({
					input: expect.objectContaining({
						ScanIndexForward: false,
					}),
				}),
			);
		});

		it("should throw AppError on database failure", async () => {
			const mockQuery = vi.fn().mockRejectedValue(new Error("DynamoDB error"));

			const mockDocClient = {
				send: mockQuery,
			} as unknown as DynamoDocClient;

			const repository = createRepository({
				docClient: mockDocClient,
				tableName: "test-table",
			});

			await expect(
				repository.queryDayBucket({
					dayBucket: "2024-10-19",
					startMs: 1729296000000,
					endMs: 1729382399999,
					minMagnitude: 2.5,
					limit: 10,
				}),
			).rejects.toThrow(AppError);
		});
	});

	describe("createQueryRequestLog", () => {
		it("should write log item with correct structure", async () => {
			const mockPut = vi.fn().mockResolvedValue({});

			const mockDocClient = {
				send: mockPut,
			} as unknown as DynamoDocClient;

			const repository = createRepository({
				docClient: mockDocClient,
				tableName: "test-table",
			});

			const now = Date.now();
			await repository.createQueryRequestLog({
				requestId: "test-request-123",
				timestamp: now,
				route: "/earthquakes",
				status: 200,
				latencyMs: 150,
				starttime: 1729296000000,
				endtime: 1729382399999,
				minmagnitude: 2.5,
				pageSize: 10,
				resultCount: 5,
				hasNextToken: false,
			});

			expect(mockPut).toHaveBeenCalled();
			const callArgs = mockPut.mock.calls[0][0];
			expect(callArgs.input.TableName).toBe("test-table");
			expect(callArgs.input.Item.requestId).toBe("test-request-123");
			expect(callArgs.input.Item.logType).toBe("QUERY");
			expect(callArgs.input.Item.entity).toBe("LOG");
			expect(callArgs.input.Item.timestamp).toBe(now);
			expect(callArgs.input.Item.ttl).toBeGreaterThan(0);
		});

		it("should set 7-day TTL on log items", async () => {
			const mockPut = vi.fn().mockResolvedValue({});

			const mockDocClient = {
				send: mockPut,
			} as unknown as DynamoDocClient;

			const repository = createRepository({
				docClient: mockDocClient,
				tableName: "test-table",
			});

			const now = Date.now();
			await repository.createQueryRequestLog({
				requestId: "test-request-123",
				timestamp: now,
				route: "/earthquakes",
				status: 200,
				latencyMs: 150,
				starttime: 1729296000000,
				endtime: 1729382399999,
				minmagnitude: 2.5,
				pageSize: 10,
				resultCount: 5,
				hasNextToken: false,
			});

			const callArgs = mockPut.mock.calls[0][0];
			const ttl = callArgs.input.Item.ttl;
			const expectedTtl = Math.floor(now / 1000) + 7 * 24 * 60 * 60;

			expect(ttl).toBeCloseTo(expectedTtl, -1);
		});
	});
});
