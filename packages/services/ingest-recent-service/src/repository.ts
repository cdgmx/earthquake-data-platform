import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { putIfNotExists } from "@earthquake/dynamo-client";
import {
	buildIngestRequestLog,
	type IngestRequestLogInput,
	writeRequestLog,
} from "@earthquake/observability";
import type { EarthquakeEventItem } from "./schemas.js";

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

export async function insertEvent(
	event: EarthquakeEventItem,
): Promise<"inserted" | "skipped"> {
	return putIfNotExists(docClient, {
		TableName: TABLE_NAME,
		Item: event,
		pkAttribute: "pk",
	});
}

export async function createIngestRequestLog(
	logInput: IngestRequestLogInput,
): Promise<void> {
	const item = buildIngestRequestLog(logInput);
	await writeRequestLog({
		tableName: TABLE_NAME,
		item,
		client: docClient,
	});
}
