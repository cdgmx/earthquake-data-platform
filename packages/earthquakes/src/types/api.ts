export type ApiErrorCode =
	| "INVALID_UPSTREAM_RESPONSE"
	| "UPSTREAM_UNAVAILABLE"
	| "INTERNAL_ERROR";

export interface ApiError {
	status: "error";
	code: ApiErrorCode;
	message: string;
	details?: Record<string, unknown> | null;
}

export interface ApiEarthquakeCoordinates {
	latitude: number | null;
	longitude: number | null;
	depthKm: number | null;
}

export interface ApiEarthquakeItem {
	id: string;
	magnitude: number | null;
	place: string;
	occurredAt: string;
	detailUrl: string;
	coordinates: ApiEarthquakeCoordinates;
}

export interface ApiEarthquakesOk {
	status: "ok";
	updatedAt: string;
	items: ApiEarthquakeItem[];
}

export type ApiResponseBody = ApiEarthquakesOk | ApiError;
