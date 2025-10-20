import {
	type AttributeValue,
	type DynamoDBClient,
	PutItemCommand,
	QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import type { EarthquakeItem } from "./schemas.js";

export interface QueryDayBucketParams {
	client: DynamoDBClient;
	tableName: string;
	dayBucket: string;
	startMs: number;
	endMs: number;
	minMagnitude: number;
	limit: number;
	exclusiveStartKey?: Record<string, unknown>;
}

export interface QueryDayBucketResult {
	items: EarthquakeItem[];
	lastEvaluatedKey?: Record<string, unknown>;
}

export async function queryDayBucket(
	params: QueryDayBucketParams,
): Promise<QueryDayBucketResult> {
	const {
		client,
		tableName,
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
	const fetchLimit = Math.max(limit * 3, 100);

	const command = new QueryCommand({
		TableName: tableName,
		IndexName: "TimeOrderedIndex",
		KeyConditionExpression: "gsi1pk = :pk AND gsi1sk BETWEEN :start AND :end",
		FilterExpression: "mag >= :minMag",
		ExpressionAttributeValues: marshall({
			":pk": `DAY#${dayBucket}`,
			":start": startMs,
			":end": endMs,
			":minMag": minMagnitude,
		}),
		ScanIndexForward: false,
		Limit: fetchLimit,
		ExclusiveStartKey: exclusiveStartKey as
			| Record<string, AttributeValue>
			| undefined,
	});

	const response = await client.send(command);

	const items: EarthquakeItem[] = (response.Items || []).map((item) => ({
		eventId: item.eventId?.S || "",
		eventTsMs: Number.parseInt(item.eventTsMs?.N || "0", 10),
		mag: Number.parseFloat(item.mag?.N || "0"),
		place: item.place?.S || "",
		lat: Number.parseFloat(item.lat?.N || "0"),
		lon: Number.parseFloat(item.lon?.N || "0"),
		depth: item.depth?.N ? Number.parseFloat(item.depth.N) : null,
	}));

	return {
		items,
		lastEvaluatedKey: response.LastEvaluatedKey
			? JSON.parse(JSON.stringify(response.LastEvaluatedKey))
			: undefined,
	};
}

export interface CreateRequestLogParams {
	client: DynamoDBClient;
	tableName: string;
	requestId: string;
	timestamp: number;
	status: number;
	latencyMs: number;
	starttime: number;
	endtime: number;
	minmagnitude: number;
	pageSize: number;
	resultCount: number;
	hasNextToken: boolean;
	bucketsScanned: number;
	error?: string;
}

export async function createRequestLog(
	params: CreateRequestLogParams,
): Promise<void> {
	const {
		client,
		tableName,
		requestId,
		timestamp,
		status,
		latencyMs,
		starttime,
		endtime,
		minmagnitude,
		pageSize,
		resultCount,
		hasNextToken,
		bucketsScanned,
		error,
	} = params;

	const date = new Date(timestamp);
	const dayBucket = date.toISOString().split("T")[0].replace(/-/g, "");
	const ttl = Math.floor(timestamp / 1000) + 7 * 24 * 60 * 60;

	const item: Record<string, unknown> = {
		pk: `LOG#${dayBucket}`,
		sk: `${timestamp}#${requestId}`,
		gsi1pk: `LOG#${dayBucket}`,
		gsi1sk: timestamp,
		entity: "LOG",
		logType: "QUERY",
		requestId,
		timestamp,
		route: "/earthquakes",
		status,
		latencyMs,
		starttime,
		endtime,
		minmagnitude,
		pageSize,
		resultCount,
		hasNextToken,
		bucketsScanned,
		ttl,
		...(error ? { error } : {}),
	};

	const itemSize = JSON.stringify(item).length;
	if (itemSize > 1024) {
		delete item.bucketsScanned;
	}

	const command = new PutItemCommand({
		TableName: tableName,
		Item: marshall(item),
	});

	try {
		await client.send(command);
	} catch (error) {
		console.warn("Failed to write request log (non-blocking):", error);
	}
}
