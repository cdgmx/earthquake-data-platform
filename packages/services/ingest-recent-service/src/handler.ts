import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { calculateFingerprint, log } from "@earthquake/utils";
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Context,
} from "aws-lambda";
import { env } from "./env.js";
import { normalizeEarthquakeEvent } from "./normalizer.js";
import { createIngestRequestLog, insertEvent } from "./repository.js";
import type { ErrorResponse } from "./schemas.js";
import { fetchRecentEarthquakes } from "./usgs-client.js";

const CLIENT = new DynamoDBClient();
const DOC_CLIENT = DynamoDBDocumentClient.from(CLIENT);
const TABLE_NAME = env.TABLE_NAME;
const USGS_API_URL = env.USGS_API_URL;

export async function handler(
	_event: APIGatewayProxyEvent,
	_context: Context,
): Promise<APIGatewayProxyResult> {
	const requestId = randomUUID();
	const startTime = Date.now();

	log({
		level: "INFO",
		timestamp: startTime,
		requestId,
		message: "Starting ingestion request",
		route: "/ingest/recent",
	});

	try {
		const { data: usgsResponse, retries } =
			await fetchRecentEarthquakes(USGS_API_URL);

		const rawResponse = JSON.stringify(usgsResponse);
		const fingerprint = calculateFingerprint(rawResponse);

		const events = usgsResponse.features.map(normalizeEarthquakeEvent);

		let upserted = 0;
		let skipped = 0;

		for (const earthquakeEvent of events) {
			try {
				const result = await insertEvent({
					event: earthquakeEvent,
					docClient: DOC_CLIENT,
					tableName: TABLE_NAME,
				});
				if (result === "inserted") {
					upserted++;
				} else {
					skipped++;
				}
			} catch (error) {
				log({
					level: "WARN",
					timestamp: Date.now(),
					requestId,
					message: `Failed to insert event ${earthquakeEvent.eventId}: ${error instanceof Error ? error.message : String(error)}`,
					route: "/ingest/recent",
				});
			}
		}

		const latencyMs = Date.now() - startTime;

		const summary = {
			fetched: events.length,
			upserted,
			skipped,
			retries,
		};

		const requestLogInput = {
			requestId,
			timestamp: startTime,
			route: "/ingest/recent",
			status: 200,
			latencyMs,
			fetched: events.length,
			upserted,
			skipped,
			retries,
			upstreamSize: fingerprint.size,
			upstreamHash: fingerprint.hash,
		};

		log({
			level: "INFO",
			timestamp: Date.now(),
			requestId,
			message: "Ingestion completed successfully",
			route: "/ingest/recent",
			status: 200,
			latencyMs,
			summary,
			upstreamFingerprint: fingerprint,
		});

		await createIngestRequestLog({
			logInput: requestLogInput,
			docClient: DOC_CLIENT,
			tableName: TABLE_NAME,
		});

		return {
			statusCode: 200,
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(summary),
		};
	} catch (error) {
		const latencyMs = Date.now() - startTime;
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";

		let statusCode = 500;
		let errorCode = "INTERNAL";

		if (errorMessage.includes("USGS API") || errorMessage.includes("fetch")) {
			statusCode = 503;
			errorCode = "USGS_UNAVAILABLE";
		} else if (
			errorMessage.includes("JSON") ||
			errorMessage.includes("parse")
		) {
			statusCode = 502;
			errorCode = "USGS_PARSE_ERROR";
		} else if (
			errorMessage.includes("DynamoDB") ||
			errorMessage.includes("Table")
		) {
			statusCode = 503;
			errorCode = "DATABASE_UNAVAILABLE";
		} else if (
			errorMessage.includes("TABLE_NAME") ||
			errorMessage.includes("environment")
		) {
			statusCode = 503;
			errorCode = "INFRASTRUCTURE_NOT_READY";
		}

		const requestLogInput = {
			requestId,
			timestamp: startTime,
			route: "/ingest/recent",
			status: statusCode,
			latencyMs,
			error: errorCode,
			fetched: 0,
			upserted: 0,
			skipped: 0,
			retries: 0,
			upstreamSize: 0,
			upstreamHash: "",
		};

		log({
			level: "ERROR",
			timestamp: Date.now(),
			requestId,
			message: `Ingestion failed: ${errorMessage}`,
			route: "/ingest/recent",
			status: statusCode,
			latencyMs,
			error: errorCode,
		});

		await createIngestRequestLog({
			logInput: requestLogInput,
			docClient: DOC_CLIENT,
			tableName: TABLE_NAME,
		});

		const errorResponse: ErrorResponse = {
			error: errorCode,
			message: errorMessage,
		};

		return {
			statusCode,
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(errorResponse),
		};
	}
}
