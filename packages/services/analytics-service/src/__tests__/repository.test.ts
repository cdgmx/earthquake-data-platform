import { describe, expect, it, vi, beforeEach } from "vitest";
import { LogType, type QueryRequestLog } from "@earthquake/schemas";
import { createRepository } from "../repository.js";

vi.mock("@earthquake/dynamo-client", () => ({
	queryItems: vi.fn(),
}));

import { queryItems } from "@earthquake/dynamo-client";

describe("repository", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("queryLogsByDay", () => {
		it("queries correct partition key", async () => {
			vi.mocked(queryItems).mockResolvedValue({
				items: [],
				lastEvaluatedKey: undefined,
			});

			const repository = createRepository({
				docClient: {} as any,
				tableName: "test-table",
			});

			await repository.queryLogsByDay({ dayBucket: "20241021" });

			expect(queryItems).toHaveBeenCalledWith(expect.anything(), {
				TableName: "test-table",
				KeyConditionExpression: "pk = :pk",
				ExpressionAttributeValues: {
					":pk": "LOG#20241021",
					":logType": LogType.Query,
				},
				FilterExpression: "logType = :logType",
				ExclusiveStartKey: undefined,
			});
		});

		it("paginates through all results", async () => {
			vi.mocked(queryItems)
				.mockResolvedValueOnce({
					items: [createLog(1)],
					lastEvaluatedKey: { pk: "LOG#20241021", sk: "abc" },
				})
				.mockResolvedValueOnce({
					items: [createLog(2)],
					lastEvaluatedKey: undefined,
				});

			const repository = createRepository({
				docClient: {} as any,
				tableName: "test-table",
			});

			const result = await repository.queryLogsByDay({ dayBucket: "20241021" });

			expect(result).toHaveLength(2);
			expect(queryItems).toHaveBeenCalledTimes(2);
		});

		it("returns empty array when no logs exist", async () => {
			vi.mocked(queryItems).mockResolvedValue({
				items: [],
				lastEvaluatedKey: undefined,
			});

			const repository = createRepository({
				docClient: {} as any,
				tableName: "test-table",
			});

			const result = await repository.queryLogsByDay({ dayBucket: "20241021" });

			expect(result).toEqual([]);
		});
	});
});

function createLog(id: number): QueryRequestLog {
	return {
		entity: "LOG",
		logType: LogType.Query,
		requestId: `test-id-${id}`,
		timestamp: 1729526400000,
		route: "/earthquakes",
		status: 200,
		latencyMs: 100,
		ttl: 1730131200,
		starttime: 1000,
		endtime: 2000,
		minmagnitude: 5,
		pageSize: 100,
		resultCount: 10,
		hasNextToken: false,
	};
}
