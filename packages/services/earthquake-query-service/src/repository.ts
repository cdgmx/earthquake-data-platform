import type { DynamoDocClient } from "@earthquake/dynamo-client";
import { queryItems } from "@earthquake/dynamo-client";
import {
	buildQueryRequestLog,
	type QueryRequestLogInput,
	writeRequestLog,
} from "@earthquake/observability";
import type { EarthquakeEvent } from "./schemas.js";

export interface QueryDayBucketParams {
	dayBucket: string;
	startMs: number;
	endMs: number;
	minMagnitude: number;
	limit: number;
	exclusiveStartKey?: Record<string, unknown>;
}

export interface QueryDayBucketResult {
	items: EarthquakeEvent[];
	lastEvaluatedKey?: Record<string, unknown>;
}

export interface EarthquakeQueryRepository {
	queryDayBucket(params: QueryDayBucketParams): Promise<QueryDayBucketResult>;
	createQueryRequestLog(input: QueryRequestLogInput): Promise<void>;
}

const FETCH_MULTIPLIER = 3;
const MIN_FETCH_LIMIT = 100;

interface CreateRepositoryParams {
	docClient: DynamoDocClient;
	tableName: string;
}

export function createRepository({
	docClient,
	tableName,
}: CreateRepositoryParams): EarthquakeQueryRepository {
	async function queryDayBucket(
		params: QueryDayBucketParams,
	): Promise<QueryDayBucketResult> {
		const {
			dayBucket,
			startMs,
			endMs,
			minMagnitude,
			limit,
			exclusiveStartKey,
		} = params;

		// Over-fetch to account for FilterExpression filtering out items
		// DynamoDB's Limit applies before FilterExpression, so we need to scan more items
		// Use 3x multiplier as a reasonable heuristic (adjust based on real data)
		const fetchLimit = Math.max(limit * FETCH_MULTIPLIER, MIN_FETCH_LIMIT);

		const response = await queryItems<EarthquakeEvent>(docClient, {
			TableName: tableName,
			IndexName: "TimeOrderedIndex",
			KeyConditionExpression: "gsi1pk = :pk AND gsi1sk BETWEEN :start AND :end",
			FilterExpression: "mag >= :minMag",
			ExpressionAttributeValues: {
				":pk": `DAY#${dayBucket}`,
				":start": startMs,
				":end": endMs,
				":minMag": minMagnitude,
			},
			ScanIndexForward: false,
			Limit: fetchLimit,
			ExclusiveStartKey: exclusiveStartKey,
		});

		return response;
	}

	async function createQueryRequestLog(
		input: QueryRequestLogInput,
	): Promise<void> {
		const item = buildQueryRequestLog(input);
		await writeRequestLog({
			tableName,
			item,
			client: docClient,
		});
	}

	return {
		queryDayBucket,
		createQueryRequestLog,
	};
}
