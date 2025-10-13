import {
	EARTHQUAKE_USGS_REQUEST_TIMEOUT_MS,
	EARTHQUAKE_USGS_WEEKLY_FEED_URL,
} from "../config";
import {
	type EarthquakeGeoJSON,
	EarthquakeGeoJSONSchema,
} from "../schemas/earthquake";
import type { ApiEarthquakesOk, ApiErrorCode } from "../types/api";
import { normalizeEarthquakes } from "./normalize";

const ACCEPT_HEADER = "application/json";

export class EarthquakeFeedError extends Error {
	constructor(
		public readonly code: ApiErrorCode,
		message: string,
		public readonly details?: Record<string, unknown>,
	) {
		super(message);
		this.name = "EarthquakeFeedError";
	}
}

const resolveErrorCode = (error: unknown): ApiErrorCode => {
	if (error instanceof EarthquakeFeedError) {
		return error.code;
	}

	if (error instanceof SyntaxError) {
		return "INVALID_UPSTREAM_RESPONSE";
	}

	return "INTERNAL_ERROR";
};

export async function fetchEarthquakeGeoJSON(): Promise<EarthquakeGeoJSON> {
	const controller = new AbortController();
	const timeoutId = setTimeout(
		() => controller.abort(),
		EARTHQUAKE_USGS_REQUEST_TIMEOUT_MS,
	);

	try {
		const response = await fetch(EARTHQUAKE_USGS_WEEKLY_FEED_URL, {
			method: "GET",
			headers: {
				accept: ACCEPT_HEADER,
			},
			cache: "no-store",
			signal: controller.signal,
		});

		if (!response.ok) {
			throw new EarthquakeFeedError(
				"UPSTREAM_UNAVAILABLE",
				`USGS feed returned status ${response.status}`,
				{ status: response.status },
			);
		}

		const raw = await response.json();
		const parsed = EarthquakeGeoJSONSchema.safeParse(raw);

		if (!parsed.success) {
			throw new EarthquakeFeedError(
				"INVALID_UPSTREAM_RESPONSE",
				"USGS feed payload failed validation",
				{
					issues: parsed.error.issues.map((issue) => ({
						message: issue.message,
						path: issue.path,
						code: issue.code,
					})),
				},
			);
		}

		return parsed.data;
	} catch (error) {
		if (error instanceof DOMException && error.name === "AbortError") {
			throw new EarthquakeFeedError(
				"UPSTREAM_UNAVAILABLE",
				"USGS feed request timed out",
			);
		}

		if (error instanceof EarthquakeFeedError) {
			throw error;
		}

		const code = resolveErrorCode(error);

		throw new EarthquakeFeedError(code, "Failed to fetch USGS feed", {
			message: error instanceof Error ? error.message : String(error),
		});
	} finally {
		clearTimeout(timeoutId);
	}
}

export async function fetchNormalizedEarthquakes(): Promise<ApiEarthquakesOk> {
	const geoJson = await fetchEarthquakeGeoJSON();
	return normalizeEarthquakes(geoJson);
}
