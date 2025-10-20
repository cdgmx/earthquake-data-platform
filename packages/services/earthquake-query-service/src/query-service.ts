import type { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { queryDayBucket } from "./repository.js";
import type { CursorPayload, EarthquakeItem } from "./schemas.js";

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
	client: DynamoDBClient;
	tableName: string;
	starttime: number;
	endtime: number;
	minmagnitude: number;
	pageSize: number;
	cursor?: CursorPayload;
}

export interface ExecuteQueryResult {
	items: EarthquakeItem[];
	nextCursor?: CursorPayload;
	bucketsScanned: number;
}

export async function executeQuery(
	params: ExecuteQueryParams,
): Promise<ExecuteQueryResult> {
	const {
		client,
		tableName,
		starttime,
		endtime,
		minmagnitude,
		pageSize,
		cursor,
	} = params;

	const buckets = cursor?.buckets || getDayBuckets(starttime, endtime);
	const startIdx = cursor?.idx || 0;
	const items: EarthquakeItem[] = [];
	let bucketsScanned = 0;

	for (let i = startIdx; i < buckets.length; i++) {
		const dayBucket = buckets[i];
		const exclusiveStartKey = i === startIdx ? cursor?.lek : undefined;

		const result = await queryDayBucket({
			client,
			tableName,
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

			items.sort((a, b) => {
				if (b.eventTsMs !== a.eventTsMs) {
					return b.eventTsMs - a.eventTsMs;
				}
				return a.eventId.localeCompare(b.eventId);
			});

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

			items.sort((a, b) => {
				if (b.eventTsMs !== a.eventTsMs) {
					return b.eventTsMs - a.eventTsMs;
				}
				return a.eventId.localeCompare(b.eventId);
			});

			return {
				items: items.slice(0, pageSize),
				nextCursor,
				bucketsScanned,
			};
		}
	}

	items.sort((a, b) => {
		if (b.eventTsMs !== a.eventTsMs) {
			return b.eventTsMs - a.eventTsMs;
		}
		return a.eventId.localeCompare(b.eventId);
	});

	return {
		items,
		bucketsScanned,
	};
}
