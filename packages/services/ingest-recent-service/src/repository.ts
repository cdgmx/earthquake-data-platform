import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { putIfNotExists, putItem } from "@earthquake/utils";
import type { EarthquakeEvent, RequestLog } from "./schemas.js";

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
