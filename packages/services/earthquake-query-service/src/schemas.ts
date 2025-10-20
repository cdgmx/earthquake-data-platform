import type { APIError, EarthquakeEvent } from "@earthquake/schemas";

export type { EarthquakeEvent } from "@earthquake/schemas/earthquake";

export interface QueryRequest {
	starttime: string | number;
	endtime: string | number;
	minmagnitude: number;
	pageSize?: number;
	nextToken?: string;
}

export interface QueryResponse {
	items: EarthquakeEvent[];
	nextToken?: string;
}

export type ErrorResponse = APIError;

export interface CursorPayload {
	v: 1;
	st: number;
	et: number;
	mm: number;
	ps: number;
	buckets: string[];
	idx: number;
	lek?: Record<string, unknown>;
}
