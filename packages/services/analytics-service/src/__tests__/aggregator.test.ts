import { LogType, type QueryRequestLog } from "@earthquake/schemas";
import { describe, expect, it } from "vitest";
import { aggregateLogs, limitResults } from "../aggregator.js";

describe("aggregator", () => {
	describe("aggregateLogs", () => {
		it("groups logs by filter tuple", () => {
			const logs: QueryRequestLog[] = [
				createLog(1000, 2000, 5, 100, 10, false),
				createLog(1000, 2000, 5, 100, 15, true),
				createLog(1000, 2000, 5, 200, 20, false),
			];

			const result = aggregateLogs(logs);

			expect(result).toHaveLength(2);
			expect(result[0]).toMatchObject({
				starttime: 1000,
				endtime: 2000,
				minmagnitude: 5,
				pageSize: 100,
				hits: 2,
				hasNextTokenCount: 1,
				avgResultCount: 12.5,
			});
		});

		it("sorts by hit count descending", () => {
			const logs: QueryRequestLog[] = [
				createLog(1000, 2000, 5, 100, 10, false),
				createLog(3000, 4000, 6, 200, 20, false),
				createLog(3000, 4000, 6, 200, 25, true),
				createLog(3000, 4000, 6, 200, 30, false),
			];

			const result = aggregateLogs(logs);

			expect(result[0]?.hits).toBe(3);
			expect(result[1]?.hits).toBe(1);
		});

		it("computes avgResultCount correctly", () => {
			const logs: QueryRequestLog[] = [
				createLog(1000, 2000, 5, 100, 10, false),
				createLog(1000, 2000, 5, 100, 20, false),
				createLog(1000, 2000, 5, 100, 30, false),
			];

			const result = aggregateLogs(logs);

			expect(result[0]?.avgResultCount).toBe(20);
		});

		it("handles empty logs", () => {
			const result = aggregateLogs([]);
			expect(result).toEqual([]);
		});
	});

	describe("limitResults", () => {
		it("limits results to specified count", () => {
			const stats = [
				{
					starttime: 1,
					endtime: 2,
					minmagnitude: 3,
					pageSize: 100,
					hits: 10,
					hasNextTokenCount: 5,
					avgResultCount: 15,
				},
				{
					starttime: 2,
					endtime: 3,
					minmagnitude: 4,
					pageSize: 200,
					hits: 8,
					hasNextTokenCount: 3,
					avgResultCount: 12,
				},
				{
					starttime: 3,
					endtime: 4,
					minmagnitude: 5,
					pageSize: 300,
					hits: 6,
					hasNextTokenCount: 2,
					avgResultCount: 10,
				},
			];

			const result = limitResults(stats, 2);

			expect(result).toHaveLength(2);
		});

		it("returns all if limit exceeds array length", () => {
			const stats = [
				{
					starttime: 1,
					endtime: 2,
					minmagnitude: 3,
					pageSize: 100,
					hits: 10,
					hasNextTokenCount: 5,
					avgResultCount: 15,
				},
			];

			const result = limitResults(stats, 10);

			expect(result).toHaveLength(1);
		});
	});
});

function createLog(
	starttime: number,
	endtime: number,
	minmagnitude: number,
	pageSize: number,
	resultCount: number,
	hasNextToken: boolean,
): QueryRequestLog {
	return {
		entity: "LOG",
		logType: LogType.Query,
		requestId: "test-id",
		timestamp: 1729526400000,
		route: "/earthquakes",
		status: 200,
		latencyMs: 100,
		ttl: 1730131200,
		starttime,
		endtime,
		minmagnitude,
		pageSize,
		resultCount,
		hasNextToken,
	};
}
