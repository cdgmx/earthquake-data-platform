import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { DynamoDocClient } from "@earthquake/dynamo-client";
import { queryItems } from "@earthquake/dynamo-client";
import {
	buildQueryRequestLog,
	type QueryRequestLogInput,
	writeRequestLog,
} from "@earthquake/observability";
import type { QueryRequestLog } from "@earthquake/schemas";
import type { EarthquakeEvent } from "./schemas.js";

const region = process.env.AWS_REGION;
if (!region) {
	throw new Error("AWS_REGION environment variable is required");
}

const tableName = process.env.TABLE_NAME;
if (!tableName) {
	throw new Error("TABLE_NAME environment variable is required");
}

const client = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = tableName;

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

export async function queryDayBucket(
	params: QueryDayBucketParams,
): Promise<QueryDayBucketResult> {
	const { dayBucket, startMs, endMs, minMagnitude, limit, exclusiveStartKey } =
		params;

	// Over-fetch to account for FilterExpression filtering out items
	// DynamoDB's Limit applies before FilterExpression, so we need to scan more items
	// Use 3x multiplier as a reasonable heuristic (adjust based on real data)
	const fetchLimit = Math.max(limit * 3, 100);

	const response = await queryItems<EarthquakeEvent>(docClient, {
		TableName: TABLE_NAME,
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

export async function createQueryRequestLog(
	logInput: QueryRequestLogInput,
): Promise<void> {
	const item = buildQueryRequestLog(logInput);
	await writeRequestLog({
		tableName: TABLE_NAME,
		item,
		client: docClient,
	});
}
