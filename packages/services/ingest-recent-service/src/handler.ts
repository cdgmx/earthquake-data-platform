import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { type FormattedErrorBody, formatErrorBody } from "@earthquake/errors";
import { createLogger, type Logger } from "@earthquake/utils";
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Context,
} from "aws-lambda";
import { env } from "./env.js";
import { normalizeEarthquakeEvent } from "./normalizer.js";
import { createIngestRequestLog, insertEvent } from "./repository.js";
import { fetchRecentEarthquakes } from "./usgs-client.js";

const CLIENT = new DynamoDBClient();
const DOC_CLIENT = DynamoDBDocumentClient.from(CLIENT);
const TABLE_NAME = env.TABLE_NAME;
const USGS_API_URL = env.USGS_API_URL;
const ROUTE_PATH = "/ingest/recent";

const baseLogger = createLogger({
	service: "ingest-recent-service",
	defaultFields: {
		route: ROUTE_PATH,
	},
});

interface IngestionSummary {
	fetched: number;
	upserted: number;
	skipped: number;
	retries: number;
}

async function ingestEarthquakeData(
	docClient: DynamoDBDocumentClient,
	logger: Logger,
): Promise<IngestionSummary> {
	const { data: usgsResponse, retries } =
		await fetchRecentEarthquakes(USGS_API_URL);
	const events = usgsResponse.features.map(normalizeEarthquakeEvent);

	logger.info(`Fetched ${events.length} events from USGS API.`);

	let upserted = 0;
	let skipped = 0;

	for (const earthquakeEvent of events) {
		try {
			const result = await insertEvent({
				event: earthquakeEvent,
				docClient: docClient,
				tableName: TABLE_NAME,
			});
			if (result === "inserted") {
				upserted++;
			} else {
				skipped++;
			}
		} catch (error) {
			logger.warn(
				`Failed to insert event ${earthquakeEvent.eventId}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	return { fetched: events.length, upserted, skipped, retries };
}

function createSuccessResponse(
	summary: IngestionSummary,
): APIGatewayProxyResult {
	return {
		statusCode: 200,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(summary),
	};
}

function createErrorResponse(error: FormattedErrorBody): APIGatewayProxyResult {
	return {
		statusCode: error.status,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(error.body),
	};
}

export async function handler(
	_event: APIGatewayProxyEvent,
	_context: Context,
): Promise<APIGatewayProxyResult> {
	const requestId = randomUUID();
	const startTime = Date.now();
	const logger = baseLogger.withCorrelationId(requestId);

	let response: APIGatewayProxyResult;
	let summary: IngestionSummary = {
		fetched: 0,
		upserted: 0,
		skipped: 0,
		retries: 0,
	};
	let status = 500;
	let errorMessage: string | undefined;

	try {
		logger.info("Starting ingestion request");
		summary = await ingestEarthquakeData(DOC_CLIENT, logger);
		status = 200;
		response = createSuccessResponse(summary);
	} catch (e) {
		const formattedError = formatErrorBody(e);
		status = formattedError.status;
		errorMessage = formattedError.body.message;
		response = createErrorResponse(formattedError);

		logger.error(`Unexpected error: ${errorMessage}`, {
			status,
			error: formattedError.body.error,
		});
	} finally {
		const latencyMs = Date.now() - startTime;

		logger.info("Ingestion request finished", { status, latencyMs, summary });

		await createIngestRequestLog({
			logInput: {
				requestId,
				timestamp: startTime,
				route: ROUTE_PATH,
				status,
				latencyMs,
				error: errorMessage,
				...summary,
			},
			docClient: DOC_CLIENT,
			tableName: TABLE_NAME,
		}).catch((_logError) => {
			logger.warn("Failed to write request log", { error: "LOG_WRITE_FAILED" });
		});
	}

	return response;
}
