import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { log } from "@earthquake/utils";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { decodeCursor, encodeCursor } from "./cursor-codec.js";
import { env } from "./env.js";
import { createQueryService } from "./query-service.js";
import { createRepository } from "./repository.js";
import type { ErrorResponse, QueryResponse } from "./schemas.js";
import { type ValidatedQueryParams, validateQueryParams } from "./validator.js";

const CLIENT = new DynamoDBClient();
const DOC_CLIENT = DynamoDBDocumentClient.from(CLIENT);
const TABLE_NAME = env.TABLE_NAME;
const nextTokenSecret = env.NEXT_TOKEN_SECRET;

const repository = createRepository({
	docClient: DOC_CLIENT,
	tableName: TABLE_NAME,
});

const queryService = createQueryService({
	repository,
});

export async function handler(
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
	const requestId = randomUUID();
	const startTime = Date.now();

	try {
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

		const result = await queryService.executeQuery({
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

		await repository.createQueryRequestLog({
			starttime: validatedParams.starttime,
			endtime: validatedParams.endtime,
			minmagnitude: validatedParams.minmagnitude,
			pageSize: validatedParams.pageSize,
			hasNextToken: !!result.nextCursor,
			bucketsScanned: result.bucketsScanned,
			resultCount: result.items.length,
			timestamp: startTime,
			requestId,
			route: "/earthquakes",
			status: 200,
			latencyMs,
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
