import type { EarthquakeQueryRepository } from "./repository.js";
import type { CursorPayload, EarthquakeEvent } from "./schemas.js";

export function getDayBuckets(starttime: number, endtime: number): string[] {
	const buckets: string[] = [];
	const start = new Date(starttime);
	const end = new Date(endtime);

	const current = new Date(
		Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
	);
	const endDay = new Date(
		Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
	);

	while (current <= endDay) {
		const year = current.getUTCFullYear();
		const month = String(current.getUTCMonth() + 1).padStart(2, "0");
		const day = String(current.getUTCDate()).padStart(2, "0");
		buckets.push(`${year}${month}${day}`);
		current.setUTCDate(current.getUTCDate() + 1);
	}

	return buckets;
}

export interface ExecuteQueryParams {
	starttime: number;
	endtime: number;
	minmagnitude: number;
	pageSize: number;
	cursor?: CursorPayload;
}

export interface ExecuteQueryResult {
	items: EarthquakeEvent[];
	nextCursor?: CursorPayload;
	bucketsScanned: number;
}

export interface QueryService {
	executeQuery(params: ExecuteQueryParams): Promise<ExecuteQueryResult>;
}

export function createQueryService({
	repository,
}: {
	repository: Pick<EarthquakeQueryRepository, "queryDayBucket">;
}): QueryService {
	async function executeQuery(
		params: ExecuteQueryParams,
	): Promise<ExecuteQueryResult> {
		const { starttime, endtime, minmagnitude, pageSize, cursor } = params;

		const buckets = cursor?.buckets || getDayBuckets(starttime, endtime);
		const startIdx = cursor?.idx || 0;
		const items: EarthquakeEvent[] = [];
		let bucketsScanned = 0;

		for (let i = startIdx; i < buckets.length; i++) {
			const dayBucket = buckets[i];

			let exclusiveStartKey: Record<string, unknown> | undefined;
			if (i === startIdx && cursor?.lek) {
				exclusiveStartKey = cursor.lek;
			}

			const result = await repository.queryDayBucket({
				dayBucket,
				startMs: starttime,
				endMs: endtime,
				minMagnitude: minmagnitude,
				limit: pageSize - items.length,
				exclusiveStartKey,
			});

			bucketsScanned++;
			items.push(...result.items);

			if (items.length >= pageSize) {
				const nextCursor: CursorPayload = {
					v: 1,
					st: starttime,
					et: endtime,
					mm: minmagnitude,
					ps: pageSize,
					buckets,
					idx: i,
					lek: result.lastEvaluatedKey,
				};

				sortItemsDescending(items);

				return {
					items: items.slice(0, pageSize),
					nextCursor,
					bucketsScanned,
				};
			}

			if (!result.lastEvaluatedKey && i < buckets.length - 1) {
				continue;
			}

			if (result.lastEvaluatedKey) {
				const nextCursor: CursorPayload = {
					v: 1,
					st: starttime,
					et: endtime,
					mm: minmagnitude,
					ps: pageSize,
					buckets,
					idx: i,
					lek: result.lastEvaluatedKey,
				};

				sortItemsDescending(items);

				return {
					items: items.slice(0, pageSize),
					nextCursor,
					bucketsScanned,
				};
			}
		}

		sortItemsDescending(items);

		return {
			items,
			bucketsScanned,
		};
	}

	return {
		executeQuery,
	};
}

function sortItemsDescending(items: EarthquakeEvent[]): void {
	items.sort((a, b) => {
		if (b.eventTsMs !== a.eventTsMs) {
			return b.eventTsMs - a.eventTsMs;
		}
		return a.eventId.localeCompare(b.eventId);
	});
}
