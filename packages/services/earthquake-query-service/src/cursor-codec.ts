import crypto from "node:crypto";
import type { CursorPayload } from "./schemas.js";

const HMAC_ALGORITHM = "sha256";

export function encodeCursor(payload: CursorPayload, secret: string): string {
	const json = JSON.stringify(payload);
	const b64Payload = Buffer.from(json).toString("base64url");
	const hmac = crypto
		.createHmac(HMAC_ALGORITHM, secret)
		.update(json)
		.digest("base64url");
	return `${b64Payload}.${hmac}`;
}

export function decodeCursor(cursor: string, secret: string): CursorPayload {
	const parts = cursor.split(".");
	if (parts.length !== 2) {
		throw new Error("Invalid nextToken format");
	}

	const [b64Payload, b64Hmac] = parts;
	const json = Buffer.from(b64Payload, "base64url").toString("utf-8");
	const expectedHmac = crypto
		.createHmac(HMAC_ALGORITHM, secret)
		.update(json)
		.digest("base64url");

	if (expectedHmac !== b64Hmac) {
		throw new Error("Invalid nextToken signature");
	}

	const payload = JSON.parse(json) as CursorPayload;

	if (payload.v !== 1) {
		throw new Error("Unsupported cursor version");
	}

	return payload;
}

export function verifyCursorFilters(
	cursor: CursorPayload,
	starttime: number,
	endtime: number,
	minmagnitude: number,
	pageSize: number,
): void {
	if (
		cursor.st !== starttime ||
		cursor.et !== endtime ||
		cursor.mm !== minmagnitude ||
		cursor.ps !== pageSize
	) {
		throw new Error("nextToken does not match query parameters");
	}
}
