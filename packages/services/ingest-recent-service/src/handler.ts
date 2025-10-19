import { randomUUID } from "node:crypto";
import { calculateFingerprint, log } from "@earthquake/utils";
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Context,
} from "aws-lambda";
import { normalizeEarthquakeEvent } from "./normalizer.js";
import { createRequestLog, insertEvent } from "./repository.js";
import type { ErrorResponse, IngestSummary } from "./schemas.js";
import { fetchRecentEarthquakes } from "./usgs-client.js";

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
		const { data: usgsResponse, retries } = await fetchRecentEarthquakes();

		const rawResponse = JSON.stringify(usgsResponse);
		const fingerprint = calculateFingerprint(rawResponse);

		const events = usgsResponse.features.map(normalizeEarthquakeEvent);

		let upserted = 0;
		let skipped = 0;

		for (const earthquakeEvent of events) {
			try {
				const result = await insertEvent(earthquakeEvent);
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

		const summary: IngestSummary = {
			fetched: events.length,
			upserted,
			skipped,
			retries,
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

		const dayBucket = new Date(startTime)
			.toISOString()
			.slice(0, 10)
			.replace(/-/g, "");

		await createRequestLog({
			pk: `LOG#${dayBucket}`,
			sk: `${startTime}#${requestId}`,
			entity: "LOG",
			requestId,
			timestamp: startTime,
			route: "/ingest/recent",
			logType: "INGEST",
			status: 200,
			latencyMs,
			fetched: summary.fetched,
			upserted: summary.upserted,
			skipped: summary.skipped,
			retries: summary.retries,
			params: {},
			upstreamSize: fingerprint.size,
			upstreamHash: fingerprint.hash,
			ttl: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
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

		const dayBucket = new Date(startTime)
			.toISOString()
			.slice(0, 10)
			.replace(/-/g, "");

		try {
			await createRequestLog({
				pk: `LOG#${dayBucket}`,
				sk: `${startTime}#${requestId}`,
				entity: "LOG",
				requestId,
				timestamp: startTime,
				route: "/ingest/recent",
				logType: "INGEST",
				status: statusCode,
				latencyMs,
				error: errorCode,
				retries: 0,
				params: {},
				ttl: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
			});
		} catch (logError) {
			log({
				level: "ERROR",
				timestamp: Date.now(),
				requestId,
				message: `Failed to create request log: ${logError instanceof Error ? logError.message : String(logError)}`,
				route: "/ingest/recent",
			});
		}

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
