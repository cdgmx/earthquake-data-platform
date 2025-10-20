import type { DynamoDocClient } from "@earthquake/dynamo-client";
import { queryItems } from "@earthquake/dynamo-client";
import { AppError, ERROR_CODES } from "@earthquake/errors";
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

		const fetchLimit = Math.max(limit * FETCH_MULTIPLIER, MIN_FETCH_LIMIT);

		try {
			const response = await queryItems<EarthquakeEvent>(docClient, {
				TableName: tableName,
				IndexName: "TimeOrderedIndex",
				KeyConditionExpression:
					"gsi1pk = :pk AND gsi1sk BETWEEN :start AND :end",
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
		} catch (error) {
			throw new AppError({
				code: ERROR_CODES.DATABASE_UNAVAILABLE,
				message: "Failed to query earthquake events",
				httpStatus: 503,
				cause: error,
				metadata: { dayBucket, startMs, endMs },
			});
		}
	}

	async function createQueryRequestLog(
		input: QueryRequestLogInput,
	): Promise<void> {
		try {
			const item = buildQueryRequestLog(input);
			await writeRequestLog({
				tableName,
				item,
				client: docClient,
			});
		} catch (error) {
			throw new AppError({
				code: ERROR_CODES.DATABASE_UNAVAILABLE,
				message: "Failed to create query request log",
				httpStatus: 503,
				cause: error,
				metadata: { requestId: input.requestId },
			});
		}
	}

	return {
		queryDayBucket,
		createQueryRequestLog,
	};
}
