
import { AppError } from "./app-error.js";
import { ERROR_CODES } from "./error-codes.js";

export interface ErrorResponse {
    error: string;
    message: string;
}

export interface FormattedErrorBody {
    status: number;
    body: ErrorResponse;
}

export function formatErrorBody(error: unknown): FormattedErrorBody {
	if (error instanceof AppError) {
		const body: ErrorResponse = {
			error: error.code,
			message: error.message,
		};

		return { status: error.httpStatus, body };
	}

	return {
		status: 500,
		body: {
			error: ERROR_CODES.INTERNAL,
			message: "An internal server error occurred.",
		},
	};
}