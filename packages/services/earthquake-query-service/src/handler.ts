import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import type { StructuredLogEvent } from "@earthquake/utils";
import { log } from "@earthquake/utils";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { decodeCursor, encodeCursor } from "./cursor-codec.js";
import { executeQuery } from "./query-service.js";
import { createRequestLog } from "./repository.js";
import type { ErrorResponse, QueryResponse } from "./schemas.js";
import { type ValidatedQueryParams, validateQueryParams } from "./validator.js";

const client = new DynamoDBClient({});

export async function handler(
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
	const requestId = randomUUID();
	const startTime = Date.now();

	try {
		const tableName = process.env.TABLE_NAME;
		const nextTokenSecret = process.env.NEXT_TOKEN_SECRET;

		if (!tableName) {
			const error: ErrorResponse = {
				error: "INFRASTRUCTURE_NOT_READY",
				message: "TABLE_NAME environment variable not set",
			};
			return {
				statusCode: 503,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(error),
			};
		}

		if (!nextTokenSecret) {
			const error: ErrorResponse = {
				error: "INFRASTRUCTURE_NOT_READY",
				message: "NEXT_TOKEN_SECRET environment variable not set",
			};
			return {
				statusCode: 503,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(error),
			};
		}

		const rawParams = event.queryStringParameters || {};

		// If nextToken is provided, restore parameters from cursor
		let params: Record<string, string | number | undefined>;
		if (rawParams.nextToken) {
			try {
				const cursor = decodeCursor(rawParams.nextToken, nextTokenSecret);
				params = {
					starttime: cursor.st,
					endtime: cursor.et,
					minmagnitude: cursor.mm,
					pageSize: cursor.ps,
					nextToken: rawParams.nextToken,
				};
			} catch (_error) {
				// Invalid cursor - return validation error
				const errorResponse: ErrorResponse = {
					error: "VALIDATION_ERROR",
					message: "Invalid query parameters",
					details: {},
				};
				const latencyMs = Date.now() - startTime;
				log({
					level: "WARN",
					timestamp: Date.now(),
					requestId,
					route: "/earthquakes",
					status: 400,
					latencyMs,
					error: "VALIDATION_ERROR",
					message: "Invalid nextToken",
				});

				return {
					statusCode: 400,
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(errorResponse),
				};
			}
		} else {
			params = {
				starttime: rawParams.starttime,
				endtime: rawParams.endtime,
				minmagnitude: rawParams.minmagnitude
					? Number.parseFloat(rawParams.minmagnitude)
					: undefined,
				pageSize: rawParams.pageSize
					? Number.parseInt(rawParams.pageSize, 10)
					: undefined,
			};

			// Convert epoch ms strings to numbers if they're numeric
			if (
				typeof params.starttime === "string" &&
				/^\d+$/.test(params.starttime)
			) {
				params.starttime = Number.parseInt(params.starttime, 10);
			}
			if (typeof params.endtime === "string" && /^\d+$/.test(params.endtime)) {
				params.endtime = Number.parseInt(params.endtime, 10);
			}
		}

		let validatedParams: ValidatedQueryParams;
		try {
			validatedParams = validateQueryParams(params, nextTokenSecret);
		} catch (error) {
			const errorResponse: ErrorResponse = {
				error: "VALIDATION_ERROR",
				message: "Invalid query parameters",
				details: error,
			};
			const latencyMs = Date.now() - startTime;

			log({
				level: "WARN",
				timestamp: Date.now(),
				requestId,
				route: "/earthquakes",
				status: 400,
				latencyMs,
				error: "VALIDATION_ERROR",
				message: "Validation failed",
			});

			return {
				statusCode: 400,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(errorResponse),
			};
		}

		const result = await executeQuery({
			client,
			tableName,
			starttime: validatedParams.starttime,
			endtime: validatedParams.endtime,
			minmagnitude: validatedParams.minmagnitude,
			pageSize: validatedParams.pageSize,
			cursor: validatedParams.cursor,
		});

		const response: QueryResponse = {
			items: result.items,
			...(result.nextCursor
				? { nextToken: encodeCursor(result.nextCursor, nextTokenSecret) }
				: {}),
		};

		const latencyMs = Date.now() - startTime;

		const logEvent: Record<string, unknown> = {
			level: "INFO" as const,
			timestamp: Date.now(),
			requestId,
			message: "Query completed successfully",
			route: "/earthquakes" as const,
			status: 200,
			latencyMs,
			query: {
				starttime: validatedParams.starttime,
				endtime: validatedParams.endtime,
				minmagnitude: validatedParams.minmagnitude,
				pageSize: validatedParams.pageSize,
			},
			summary: {
				resultCount: result.items.length,
				bucketsScanned: result.bucketsScanned,
				hasNextToken: !!result.nextCursor,
			},
		};

		const logSize = JSON.stringify(logEvent).length;
		if (logSize > 8192) {
			delete logEvent.query;
			logEvent._truncated = true;
		}

		log(logEvent as StructuredLogEvent);

		await createRequestLog({
			client,
			tableName,
			requestId,
			timestamp: startTime,
			status: 200,
			latencyMs,
			starttime: validatedParams.starttime,
			endtime: validatedParams.endtime,
			minmagnitude: validatedParams.minmagnitude,
			pageSize: validatedParams.pageSize,
			resultCount: result.items.length,
			hasNextToken: !!result.nextCursor,
			bucketsScanned: result.bucketsScanned,
		});

		return {
			statusCode: 200,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(response),
		};
	} catch (error) {
		const latencyMs = Date.now() - startTime;

		log({
			level: "ERROR",
			timestamp: Date.now(),
			requestId,
			route: "/earthquakes",
			status: 503,
			latencyMs,
			error: "DATABASE_UNAVAILABLE",
			message: error instanceof Error ? error.message : "Unknown error",
		});

		const errorResponse: ErrorResponse = {
			error: "DATABASE_UNAVAILABLE",
			message: "Database query failed",
		};

		return {
			statusCode: 503,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(errorResponse),
		};
	}
}
