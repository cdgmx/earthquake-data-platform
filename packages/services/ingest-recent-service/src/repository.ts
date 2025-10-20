import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { putIfNotExists } from "@earthquake/dynamo-client";
import { AppError, ERROR_CODES } from "@earthquake/errors";
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
	try {
		return await putIfNotExists(docClient, {
			TableName: tableName,
			Item: event,
			pkAttribute: "pk",
		});
	} catch (error) {
		throw new AppError({
			code: ERROR_CODES.DATABASE_UNAVAILABLE,
			message: "Failed to insert earthquake event",
			httpStatus: 503,
			cause: error,
			metadata: { eventId: event.eventId },
		});
	}
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
	try {
		const item = buildIngestRequestLog(logInput);
		await writeRequestLog({
			tableName: tableName,
			item,
			client: docClient,
		});
	} catch (error) {
		throw new AppError({
			code: ERROR_CODES.DATABASE_UNAVAILABLE,
			message: "Failed to create ingest request log",
			httpStatus: 503,
			cause: error,
			metadata: { requestId: logInput.requestId },
		});
	}
}
