import * as crypto from "node:crypto";

export type LogLevel = "INFO" | "WARN" | "ERROR";

export interface LogFingerprint {
	size: number;
	hash: string;
}

export function calculateFingerprint(data: string): LogFingerprint {
	const hash = crypto.createHash("sha256").update(data).digest("hex");
	return {
		size: Buffer.byteLength(data, "utf8"),
		hash,
	};
}

export interface LoggerConfig {
	service: string;
	defaultFields?: Record<string, unknown>;
	redactKeys?: string[];
}

export interface Logger {
	info(message: string, fields?: Record<string, unknown>): void;
	warn(message: string, fields?: Record<string, unknown>): void;
	error(message: string, fields?: Record<string, unknown>): void;
	withCorrelationId(correlationId: string): Logger;
}

function redactSensitiveFields(
	fields: Record<string, unknown>,
	redactKeys: string[],
): Record<string, unknown> {
	if (redactKeys.length === 0) {
		return fields;
	}

	const redacted: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(fields)) {
		redacted[key] = redactKeys.includes(key) ? "[REDACTED]" : value;
	}
	return redacted;
}

export function createLogger(
	config: LoggerConfig,
	correlationId?: string,
): Logger {
	const { service, defaultFields = {}, redactKeys = [] } = config;

	const logWithLevel = (
		level: LogLevel,
		message: string,
		fields?: Record<string, unknown>,
	): void => {
		const combinedFields = {
			...defaultFields,
			...(fields || {}),
		};

		const redactedFields = redactSensitiveFields(combinedFields, redactKeys);

		const event = {
			level,
			timestamp: Date.now(),
			message,
			service,
			environment: process.env.NODE_ENV || "development",
			...(correlationId ? { correlationId } : {}),
			...redactedFields,
		};

		console.log(JSON.stringify(event));
	};

	return {
		info(message: string, fields?: Record<string, unknown>): void {
			logWithLevel("INFO", message, fields);
		},
		warn(message: string, fields?: Record<string, unknown>): void {
			logWithLevel("WARN", message, fields);
		},
		error(message: string, fields?: Record<string, unknown>): void {
			logWithLevel("ERROR", message, fields);
		},
		withCorrelationId(id: string): Logger {
			return createLogger(
				{
					service,
					defaultFields,
					redactKeys,
				},
				id,
			);
		},
	};
}
