import { z } from "zod";

export const QueryParamsSchema = z.object({
	day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "day must be YYYY-MM-DD"),
	windowDays: z.coerce
		.number()
		.int()
		.min(1, "windowDays must be at least 1")
		.max(7, "windowDays cannot exceed 7")
		.optional()
		.default(1),
	limit: z.coerce
		.number()
		.int()
		.min(1, "limit must be at least 1")
		.max(50, "limit cannot exceed 50")
		.optional()
		.default(10),
});

export type QueryParams = z.infer<typeof QueryParamsSchema>;

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

export interface ErrorResponse {
	error: string;
	message: string;
}
