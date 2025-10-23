import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { AppError, ERROR_CODES } from "@earthquake/errors";
import { createLogger } from "@earthquake/utils";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { encodeCursor } from "./cursor-codec.js";
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

const baseLogger = createLogger({
	service: "earthquake-query-service",
	defaultFields: {
		route: "/earthquakes",
	},
});

export async function handler(
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
	const requestId = randomUUID();
	const startTime = Date.now();
	const logger = baseLogger.withCorrelationId(requestId);

	let validatedParams: ValidatedQueryParams;

	try {
		const rawParams = event.queryStringParameters;

		validatedParams = validateQueryParams(rawParams, nextTokenSecret);

		const result = await queryService.executeQuery({
			starttime: validatedParams.starttime,
			endtime: validatedParams.endtime,
			minmagnitude: validatedParams.minmagnitude,
			pageSize: validatedParams.pageSize,
			cursor: validatedParams.cursor,
		});

		const response: QueryResponse = {
			items: result.items,
		};

		if (result.nextCursor) {
			response.nextToken = encodeCursor(result.nextCursor, nextTokenSecret);
		}

		const latencyMs = Date.now() - startTime;

		try {
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
		} catch (_logError) {
			logger.warn("Failed to write request log", {
				error: "LOG_WRITE_FAILED",
			});
		}

		return {
			statusCode: 200,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(response),
		};
	} catch (error) {
		const latencyMs = Date.now() - startTime;

		let statusCode = 500;
		let errorCode: string = ERROR_CODES.INTERNAL;
		let errorMessage = "Unknown error";

		if (error instanceof AppError) {
			statusCode = error.httpStatus;
			errorCode = error.code;
			errorMessage = error.message;
		} else {
			errorMessage = error instanceof Error ? error.message : String(error);
		}

		logger.error(errorMessage, {
			status: statusCode,
			latencyMs,
			error: errorCode,
		});

		const errorResponse: ErrorResponse = {
			error: errorCode,
			message: errorMessage,
		};

		return {
			statusCode,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(errorResponse),
		};
	}
}
