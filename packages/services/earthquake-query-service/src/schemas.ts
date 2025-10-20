import type { APIError, EarthquakeItem } from "@earthquake/schemas";

export interface QueryRequest {
	starttime: string | number;
	endtime: string | number;
	minmagnitude: number;
	pageSize?: number;
	nextToken?: string;
}

export interface QueryResponse {
	items: EarthquakeItem[];
	nextToken?: string;
}

export type { EarthquakeItem };
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
