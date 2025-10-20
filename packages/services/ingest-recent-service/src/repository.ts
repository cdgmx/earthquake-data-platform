import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { putIfNotExists } from "@earthquake/dynamo-client";
import {
	buildIngestRequestLog,
	type IngestRequestLogInput,
	writeRequestLog,
} from "@earthquake/observability";
import type { EarthquakeEventItem } from "./schemas.js";

interface InsertEventParams {
	event: EarthquakeEventItem;
	docClient: DynamoDBDocumentClient;
	tableName: string;
}

export async function insertEvent({
	event,
	docClient,
	tableName,
}: InsertEventParams): Promise<"inserted" | "skipped"> {
	return putIfNotExists(docClient, {
		TableName: tableName,
		Item: event,
		pkAttribute: "pk",
	});
}

interface CreateIngestRequestLogParams {
	logInput: IngestRequestLogInput;
	docClient: DynamoDBDocumentClient;
	tableName: string;
}

export async function createIngestRequestLog({
	logInput,
	docClient,
	tableName,
}: CreateIngestRequestLogParams): Promise<void> {
	const item = buildIngestRequestLog(logInput);
	await writeRequestLog({
		tableName: tableName,
		item,
		client: docClient,
	});
}
