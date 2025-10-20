import type { QueryRequestLog } from "@earthquake/schemas";
import type { FilterStats } from "./schemas.js";

interface FilterKey {
	starttime: number;
	endtime: number;
	minmagnitude: number;
	pageSize: number;
}

interface FilterAccumulator {
	hits: number;
	hasNextTokenCount: number;
	totalResultCount: number;
}

export function aggregateLogs(logs: QueryRequestLog[]): FilterStats[] {
	const statsMap = buildStatsMap(logs);
	const results = convertMapToResults(statsMap);
	return sortByHitsDescending(results);
}

function buildStatsMap(
	logs: QueryRequestLog[],
): Map<string, FilterAccumulator> {
	const statsMap = new Map<string, FilterAccumulator>();

	for (const log of logs) {
		const key = buildFilterKey({
			starttime: log.starttime,
			endtime: log.endtime,
			minmagnitude: log.minmagnitude,
			pageSize: log.pageSize,
		});

		const current = statsMap.get(key);
		if (!current) {
			statsMap.set(key, {
				hits: 1,
				hasNextTokenCount: log.hasNextToken ? 1 : 0,
				totalResultCount: log.resultCount,
			});
		} else {
			statsMap.set(key, {
				hits: current.hits + 1,
				hasNextTokenCount: current.hasNextTokenCount + (log.hasNextToken ? 1 : 0),
				totalResultCount: current.totalResultCount + log.resultCount,
			});
		}
	}

	return statsMap;
}

function convertMapToResults(
	statsMap: Map<string, FilterAccumulator>,
): FilterStats[] {
	const results: FilterStats[] = [];

	for (const [keyStr, acc] of statsMap) {
		const key = parseFilterKey(keyStr);
		
		let avgResultCount = 0;
		if (acc.hits > 0) {
			avgResultCount = acc.totalResultCount / acc.hits;
		}
		
		results.push({
			...key,
			hits: acc.hits,
			hasNextTokenCount: acc.hasNextTokenCount,
			avgResultCount,
		});
	}

	return results;
}

function sortByHitsDescending(stats: FilterStats[]): FilterStats[] {
	return stats.sort((a, b) => b.hits - a.hits);
}

export function limitResults(
	stats: FilterStats[],
	limit: number,
): FilterStats[] {
	return stats.slice(0, limit);
}

function buildFilterKey(filter: FilterKey): string {
	return `${filter.starttime}|${filter.endtime}|${filter.minmagnitude}|${filter.pageSize}`;
}

function parseFilterKey(key: string): FilterKey {
	const [starttime, endtime, minmagnitude, pageSize] = key.split("|");
	return {
		starttime: Number(starttime),
		endtime: Number(endtime),
		minmagnitude: Number(minmagnitude),
		pageSize: Number(pageSize),
	};
}
