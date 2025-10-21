import type {
	AnalyticsResponse,
	BackendErrorResponse,
	BackendQueryParams,
	BackendQueryResponse,
} from "../types/api";

export class BackendApiError extends Error {
	constructor(
		public readonly statusCode: number,
		public readonly body: BackendErrorResponse,
	) {
		super(body.message);
		this.name = "BackendApiError";
	}
}

export interface FetchBackendOptions {
	headers?: Record<string, string>;
}

const buildRequestHeaders = (
	optionsHeaders: FetchBackendOptions["headers"],
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

export const buildBackendApiUrl = (
	baseUrl: string,
	params: BackendQueryParams,
): string => {
	const url = new URL(baseUrl);
	url.pathname = `${url.pathname.replace(/\/$/, "")}/earthquakes`;

	url.searchParams.set("starttime", String(params.starttime));
	url.searchParams.set("endtime", String(params.endtime));
	url.searchParams.set("minmagnitude", String(params.minmagnitude));

	if (params.pageSize !== undefined) {
		url.searchParams.set("pageSize", String(params.pageSize));
	}

	if (params.nextToken !== undefined && params.nextToken.length > 0) {
		url.searchParams.set("nextToken", params.nextToken);
	}

	return url.toString();
};

export async function fetchEarthquakesFromBackend(
	baseUrl: string,
	params: BackendQueryParams,
	options: FetchBackendOptions = {},
): Promise<BackendQueryResponse> {
	const endpoint = buildBackendApiUrl(baseUrl, params);
	const response = await fetch(endpoint, {
		method: "GET",
		headers: buildRequestHeaders(options.headers),
		cache: "no-store",
	});

	const payload = await response.json().catch(() => null);

	if (response.ok && payload && typeof payload === "object") {
		if ("items" in payload && Array.isArray(payload.items)) {
			return payload as BackendQueryResponse;
		}
	}

	if (
		payload &&
		typeof payload === "object" &&
		"error" in payload &&
		"message" in payload
	) {
		throw new BackendApiError(response.status, payload as BackendErrorResponse);
	}

	throw new BackendApiError(response.status, {
		error: "INVALID_UPSTREAM_RESPONSE",
		message: "Received an unexpected response from the backend API.",
		details: { endpoint, status: response.status },
	});
}

export const buildAnalyticsUrl = (
	baseUrl: string,
	day: string,
	windowDays: number,
	limit: number,
): string => {
	const url = new URL(baseUrl);
	url.pathname = `${url.pathname.replace(/\/$/, "")}/analytics/popular-filters`;
	url.searchParams.set("day", day);
	url.searchParams.set("windowDays", String(windowDays));
	url.searchParams.set("limit", String(limit));
	return url.toString();
};

export async function fetchPopularFilters(
	baseUrl: string,
	day: string,
	windowDays = 7,
	limit = 10,
	options: FetchBackendOptions = {},
): Promise<AnalyticsResponse> {
	const endpoint = buildAnalyticsUrl(baseUrl, day, windowDays, limit);
	const response = await fetch(endpoint, {
		method: "GET",
		headers: buildRequestHeaders(options.headers),
		cache: "no-store",
	});

	const payload = await response.json().catch(() => null);

	if (response.ok && payload && typeof payload === "object") {
		if ("filters" in payload && Array.isArray(payload.filters)) {
			return payload as AnalyticsResponse;
		}
	}

	if (
		payload &&
		typeof payload === "object" &&
		"error" in payload &&
		"message" in payload
	) {
		throw new BackendApiError(response.status, payload as BackendErrorResponse);
	}

	throw new BackendApiError(response.status, {
		error: "INVALID_UPSTREAM_RESPONSE",
		message: "Received an unexpected response from the analytics API.",
		details: { endpoint, status: response.status },
	});
}
