import { ApiEarthquakesOkSchema, ApiErrorSchema } from "../schemas/earthquake";
import type { ApiEarthquakesOk, ApiError } from "../types/api";

const API_PATH = "/api/earthquakes";

export class ApiClientError extends Error {
	constructor(
		public readonly statusCode: number,
		public readonly body: ApiError,
	) {
		super(body.message);
		this.name = "ApiClientError";
	}
}

export const buildEarthquakesApiUrl = (origin: string): string => {
	const url = new URL(API_PATH, origin);
	return url.toString();
};

export interface FetchEarthquakesOptions {
	headers?: Record<string, string>;
}

const buildRequestHeaders = (
	optionsHeaders: FetchEarthquakesOptions["headers"],
): Record<string, string> => {
	const headers: Record<string, string> = {
		accept: "application/json",
	};

	if (optionsHeaders) {
		for (const [key, value] of Object.entries(optionsHeaders)) {
			if (typeof value === "string" && value.length > 0) {
				headers[key] = value;
			}
		}
	}

	return headers;
};

export async function fetchEarthquakesFromApi(
	origin: string,
	options: FetchEarthquakesOptions = {},
): Promise<ApiEarthquakesOk> {
	const endpoint = buildEarthquakesApiUrl(origin);
	const response = await fetch(endpoint, {
		method: "GET",
		headers: buildRequestHeaders(options.headers),
		cache: "no-store",
	});

	const payload = await response.json().catch(() => null);

	const parsedOk = ApiEarthquakesOkSchema.safeParse(payload);
	if (response.ok && parsedOk.success) {
		return parsedOk.data;
	}

	const parsedError = ApiErrorSchema.safeParse(payload);
	if (parsedError.success) {
		throw new ApiClientError(response.status, parsedError.data);
	}

	throw new ApiClientError(response.status, {
		status: "error",
		code: "INVALID_UPSTREAM_RESPONSE",
		message: "Received an unexpected response from the earthquakes API.",
		details: { endpoint, status: response.status },
	});
}
