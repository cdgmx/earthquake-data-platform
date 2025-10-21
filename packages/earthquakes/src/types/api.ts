export type ApiErrorCode =
	| "INVALID_UPSTREAM_RESPONSE"
	| "UPSTREAM_UNAVAILABLE"
	| "INTERNAL_ERROR"
	| "VALIDATION_ERROR"
	| "DATABASE_UNAVAILABLE"
	| "INFRASTRUCTURE_NOT_READY";

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

export interface BackendQueryParams {
	starttime: string | number;
	endtime: string | number;
	minmagnitude: number;
	pageSize?: number;
	nextToken?: string;
}

export interface BackendEarthquakeEvent {
	eventId: string;
	eventTsMs: number;
	lat: number | null;
	lon: number | null;
	depth: number | null;
	mag: number | null;
	place: string | null;
	detailUrl?: string | null;
}

export interface BackendQueryResponse {
	items: BackendEarthquakeEvent[];
	nextToken?: string;
}

export interface BackendErrorResponse {
	error: string;
	message: string;
	details: Record<string, unknown>;
}

export interface PopularFilter {
	starttime: number;
	endtime: number;
	minmagnitude: number;
	pageSize: number;
	hits: number;
	hasNextTokenCount: number;
	avgResultCount: number;
}

export interface AnalyticsResponse {
	window: {
		startDay: string;
		endDay: string;
	};
	filters: PopularFilter[];
	totalRequests: number;
}
