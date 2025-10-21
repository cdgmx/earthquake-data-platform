import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { AppError, ERROR_CODES, formatErrorBody } from "@earthquake/errors";
import { createLogger } from "@earthquake/utils";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { env } from "./env.js";
import { createRepository } from "./repository.js";
import { QueryParamsSchema } from "./schemas.js";
import { createAnalyticsService } from "./service.js";

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

	try {
		const rawParams = event.queryStringParameters;
		if (!rawParams) {
			throw new AppError({
				code: ERROR_CODES.VALIDATION_ERROR,
				message: "Missing query parameters",
				httpStatus: 400,
			});
		}

		const validationResult = QueryParamsSchema.safeParse(rawParams);
		if (!validationResult.success) {
			const errorMessage = validationResult.error.message;
			if (!errorMessage) {
				throw new AppError({
					code: ERROR_CODES.VALIDATION_ERROR,
					message: "Invalid query parameters",
					httpStatus: 400,
				});
			}

			throw new AppError({
				code: ERROR_CODES.VALIDATION_ERROR,
				message: errorMessage,
				httpStatus: 400,
			});
		}

		const { day, windowDays, limit } = validationResult.data;

		const endDay = day;
		const startDate = new Date(day);
		startDate.setUTCDate(startDate.getUTCDate() - (windowDays - 1));
		const startDay = startDate.toISOString().slice(0, 10);

		const result = await analyticsService.getPopularFilters({
			startDay,
			endDay,
			windowDays,
			limit,
		});

		const latencyMs = Date.now() - startTime;

		logger.info("Analytics request completed", {
			requestId,
			day,
			windowDays,
			limit,
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

		const formatted = formatErrorBody(error);

		let errorDetails: { message: string; name: string } | string;
		if (error instanceof Error) {
			errorDetails = {
				message: error.message,
				name: error.name,
			};
		} else {
			errorDetails = String(error);
		}

		logger.error("Analytics request failed", {
			requestId,
			error: errorDetails,
			latencyMs,
		});

		return {
			statusCode: formatted.status,
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(formatted.body),
		};
	}
}
