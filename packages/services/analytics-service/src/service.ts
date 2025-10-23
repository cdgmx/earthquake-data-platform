import type { QueryRequestLog } from "@earthquake/schemas";
import { aggregateLogs, limitResults } from "./aggregator.js";
import type { AnalyticsRepository } from "./repository.js";
import type { AnalyticsResponse } from "./schemas.js";

interface ServiceParams {
	repository: AnalyticsRepository;
}

interface GetPopularFiltersParams {
	day: string;
	windowDays: number;
	limit: number;
}

export interface AnalyticsService {
	getPopularFilters(
		params: GetPopularFiltersParams,
	): Promise<AnalyticsResponse>;
}

export function createAnalyticsService({
	repository,
}: ServiceParams): AnalyticsService {
	async function getPopularFilters(
		params: GetPopularFiltersParams,
	): Promise<AnalyticsResponse> {
		const { day, windowDays, limit } = params;

		const endDay = day;
		const startDate = new Date(day);
		startDate.setUTCDate(startDate.getUTCDate() - (windowDays - 1));
		const startDay = startDate.toISOString().slice(0, 10);

		const dayBuckets = generateDayBuckets(startDay, windowDays);
		const allLogs = await collectLogsFromDayBuckets(dayBuckets, repository);

		const aggregated = aggregateLogs(allLogs);
		const limited = limitResults(aggregated, limit);

		return {
			window: {
				startDay,
				endDay,
			},
			filters: limited,
			totalRequests: allLogs.length,
		};
	}

	return {
		getPopularFilters,
	};
}

async function collectLogsFromDayBuckets(
	dayBuckets: string[],
	repository: AnalyticsRepository,
): Promise<QueryRequestLog[]> {
	const allLogs: QueryRequestLog[] = [];

	for (const dayBucket of dayBuckets) {
		try {
			const logs = await repository.queryLogsByDay({ dayBucket });
			allLogs.push(...logs);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			throw new Error(
				`Failed to query logs for day bucket ${dayBucket}: ${errorMessage}`,
			);
		}
	}

	return allLogs;
}

function generateDayBuckets(startDay: string, windowDays: number): string[] {
	const buckets: string[] = [];
	const startDate = new Date(startDay);

	for (let daysBack = 0; daysBack < windowDays; daysBack++) {
		const currentDate = new Date(startDate);
		currentDate.setUTCDate(startDate.getUTCDate() - daysBack);

		const isoDate = currentDate.toISOString().slice(0, 10);
		const bucket = isoDate.replace(/-/g, "");

		buckets.push(bucket);
	}

	return buckets;
}
