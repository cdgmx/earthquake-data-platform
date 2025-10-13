import type { ApiError, ApiErrorCode } from "../types/api";

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
