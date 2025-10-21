import type { ApiError, ApiErrorCode } from "@earthquake/schemas";

interface ErrorMapping {
	statusCode: number;
	defaultMessage: string;
}

const ERROR_MAPPINGS: Record<ApiErrorCode, ErrorMapping> = {
	INVALID_UPSTREAM_RESPONSE: {
		statusCode: 502,
		defaultMessage:
			"The upstream earthquake feed returned data in an unexpected format.",
	},
	UPSTREAM_UNAVAILABLE: {
		statusCode: 504,
		defaultMessage:
			"The upstream earthquake feed did not respond before the timeout window.",
	},
	INTERNAL_ERROR: {
		statusCode: 500,
		defaultMessage:
			"An unexpected error occurred while processing the request.",
	},
	VALIDATION_ERROR: {
		statusCode: 400,
		defaultMessage:
			"The request parameters are invalid. Please check your input and try again.",
	},
	DATABASE_UNAVAILABLE: {
		statusCode: 503,
		defaultMessage:
			"The database is currently unavailable. Please try again later.",
	},
	INFRASTRUCTURE_NOT_READY: {
		statusCode: 503,
		defaultMessage:
			"The service infrastructure is not ready. Please try again in a moment.",
	},
};

export interface ApiErrorOptions {
	message?: string;
	details?: Record<string, unknown> | null;
}

export interface ApiErrorResult {
	statusCode: number;
	body: ApiError;
}

export function buildApiError(
	code: ApiErrorCode,
	options: ApiErrorOptions = {},
): ApiErrorResult {
	const mapping = ERROR_MAPPINGS[code];
	const message = options.message ?? mapping.defaultMessage;

	const body: ApiError = {
		status: "error",
		code,
		message,
		...(options.details ? { details: options.details } : {}),
	};

	return { statusCode: mapping.statusCode, body };
}

export function normalizeErrorDetails(
	input: unknown,
): Record<string, unknown> | null {
	if (!input) {
		return null;
	}

	if (input instanceof Error) {
		const { message, name } = input;
		return { name, message };
	}

	if (typeof input === "object") {
		return input as Record<string, unknown>;
	}

	return { value: input };
}
