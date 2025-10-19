import * as crypto from "node:crypto";

export type LogLevel = "INFO" | "WARN" | "ERROR";

export interface LogFingerprint {
	size: number;
	hash: string;
}

const MAX_LOG_SIZE_BYTES = 8 * 1024;

export type StructuredLogMessage =
	| string
	| number
	| boolean
	| null
	| Record<string, unknown>;

export type StructuredLogEvent<
	TFields extends Record<string, unknown> = Record<string, unknown>,
> = {
	level: LogLevel;
	timestamp: number;
	message: StructuredLogMessage;
	requestId?: string;
	route?: string;
	status?: number;
	latencyMs?: number;
	error?: string;
	upstreamFingerprint?: LogFingerprint;
} & TFields & {
		_truncated?: boolean;
	};

export function log<TFields extends Record<string, unknown>>(
	event: StructuredLogEvent<TFields>,
): void {
	const serialized = JSON.stringify(event);

	if (serialized.length > MAX_LOG_SIZE_BYTES) {
		let truncatedMessage = event.message;
		if (typeof event.message === "string") {
			const overflowBytes = serialized.length - MAX_LOG_SIZE_BYTES;
			const safeLength = Math.max(
				0,
				event.message.length - overflowBytes - 100,
			);
			truncatedMessage = event.message.slice(0, safeLength);
		}

		const truncated: StructuredLogEvent<TFields> = {
			...event,
			_truncated: true,
			message: truncatedMessage,
		};
		const truncatedSerialized = JSON.stringify(truncated);
		console.log(truncatedSerialized.slice(0, MAX_LOG_SIZE_BYTES));
		return;
	}

	console.log(serialized);
}

export function calculateFingerprint(data: string): LogFingerprint {
	const hash = crypto.createHash("sha256").update(data).digest("hex");
	return {
		size: Buffer.byteLength(data, "utf8"),
		hash,
	};
}
