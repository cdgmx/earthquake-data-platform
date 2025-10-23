import type { APIError } from "@earthquake/schemas";

export interface FilterStats {
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
	filters: FilterStats[];
	totalRequests: number;
}

export type ErrorResponse = APIError;
