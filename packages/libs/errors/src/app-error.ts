import type { ErrorCode } from "./error-codes.js";

export interface AppErrorOptions {
	code: ErrorCode;
	message: string;
	httpStatus: number;
	cause?: Error | unknown;
	metadata?: Record<string, unknown>;
}

export class AppError extends Error {
	public readonly code: ErrorCode;
	public readonly httpStatus: number;
	public readonly cause?: Error | unknown;
	public readonly metadata?: Record<string, unknown>;

	constructor(options: AppErrorOptions) {
		super(options.message);
		this.name = "AppError";
		this.code = options.code;
		this.httpStatus = options.httpStatus;
		this.cause = options.cause;
		this.metadata = options.metadata;

		Error.captureStackTrace(this, this.constructor);
	}

	toJSON(): Record<string, unknown> {
		const base: Record<string, unknown> = {
			name: this.name,
			code: this.code,
			message: this.message,
			httpStatus: this.httpStatus,
		};

		if (this.metadata !== undefined) {
			base.metadata = this.metadata;
		}

		return base;
	}
}
