import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { putIfNotExists, putItem } from "@earthquake/utils";
import type { EarthquakeEvent, RequestLog } from "./schemas.js";

const client = new DynamoDBClient({
	region: process.env.AWS_REGION || "us-east-1",
});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || "earthquake-events";

export async function insertEvent(
	event: EarthquakeEvent,
): Promise<"inserted" | "skipped"> {
	return putIfNotExists(docClient, {
		TableName: TABLE_NAME,
		Item: event,
		pkAttribute: "pk",
	});
}

export async function createRequestLog(log: RequestLog): Promise<void> {
	return putItem(docClient, { TableName: TABLE_NAME, Item: log });
}

export function createRepositoryForTesting(
	overrides: {
		docClient?: ReturnType<typeof DynamoDBDocumentClient.from>;
		tableName?: string;
	} = {},
) {
	const ddb = overrides.docClient ?? docClient;
	const table = overrides.tableName ?? TABLE_NAME;
	return {
		insertEvent: (event: EarthquakeEvent) =>
			putIfNotExists(ddb, { TableName: table, Item: event, pkAttribute: "pk" }),
		createRequestLog: (log: RequestLog) =>
			putItem(ddb, { TableName: table, Item: log }),
	};
}
