import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { AppError, ERROR_CODES } from "@earthquake/errors";
import { createLogger } from "@earthquake/utils";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { env } from "./env.js";
import { createRepository } from "./repository.js";
import type { ErrorResponse } from "./schemas.js";
import { createAnalyticsService } from "./service.js";
import { type ValidatedQueryParams, validateQueryParams } from "./validator.js";

const CLIENT = new DynamoDBClient();
const DOC_CLIENT = DynamoDBDocumentClient.from(CLIENT);
const TABLE_NAME = env.TABLE_NAME;

const repository = createRepository({
	docClient: DOC_CLIENT,
	tableName: TABLE_NAME,
});

const analyticsService = createAnalyticsService({
	repository,
});

const baseLogger = createLogger({
	service: "analytics-service",
	defaultFields: {
		route: "/analytics/popular-filters",
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

		validatedParams = validateQueryParams(rawParams);

		const result = await analyticsService.getPopularFilters({
			day: validatedParams.day,
			windowDays: validatedParams.windowDays,
			limit: validatedParams.limit,
		});

		const latencyMs = Date.now() - startTime;

		logger.info("Analytics request completed", {
			requestId,
			day: validatedParams.day,
			windowDays: validatedParams.windowDays,
			limit: validatedParams.limit,
			totalRequests: result.totalRequests,
			filterCount: result.filters.length,
			latencyMs,
		});

		return {
			statusCode: 200,
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(result),
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
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(errorResponse),
		};
	}
}
