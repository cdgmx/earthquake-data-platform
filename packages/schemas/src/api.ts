import { z } from "zod";

export const ApiEarthquakeCoordinatesSchema = z.object({
	latitude: z.number().nullable(),
	longitude: z.number().nullable(),
	depthKm: z.number().nullable(),
});

export const ApiEarthquakeItemSchema = z.object({
	id: z.string(),
	magnitude: z.number().nullable(),
	place: z.string(),
	occurredAt: z.string(),
	detailUrl: z.string(),
	coordinates: ApiEarthquakeCoordinatesSchema,
});

export const ApiEarthquakesOkSchema = z.object({
	status: z.literal("ok"),
	updatedAt: z.string(),
	items: z.array(ApiEarthquakeItemSchema),
	nextToken: z.string().optional(),
});

export const ApiErrorCodeSchema = z.enum([
	"INVALID_UPSTREAM_RESPONSE",
	"UPSTREAM_UNAVAILABLE",
	"INTERNAL_ERROR",
	"VALIDATION_ERROR",
	"DATABASE_UNAVAILABLE",
	"INFRASTRUCTURE_NOT_READY",
]);

export const ApiErrorSchema = z.object({
	status: z.literal("error"),
	code: ApiErrorCodeSchema,
	message: z.string(),
	details: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const ApiResponseBodySchema = z.union([
	ApiEarthquakesOkSchema,
	ApiErrorSchema,
]);

export const BackendQueryParamsSchema = z.object({
	starttime: z.union([z.string(), z.number()]),
	endtime: z.union([z.string(), z.number()]),
	minmagnitude: z.number(),
	pageSize: z.number().optional(),
	nextToken: z.string().optional(),
});

export const BackendEarthquakeEventSchema = z.object({
	eventId: z.string(),
	eventTsMs: z.number(),
	lat: z.number().nullable(),
	lon: z.number().nullable(),
	depth: z.number().nullable(),
	mag: z.number().nullable(),
	place: z.string().nullable(),
	detailUrl: z.string().nullable().optional(),
});

export const BackendQueryResponseSchema = z.object({
	items: z.array(BackendEarthquakeEventSchema),
	nextToken: z.string().optional(),
});

export const BackendErrorResponseSchema = z.object({
	error: z.string(),
	message: z.string(),
	details: z.record(z.string(), z.unknown()),
});

export const PopularFilterSchema = z.object({
	starttime: z.number(),
	endtime: z.number(),
	minmagnitude: z.number(),
	count: z.number(),
});

export const AnalyticsResponseSchema = z.object({
	filters: z.array(PopularFilterSchema),
	totalRequests: z.number(),
});

export type ApiEarthquakeCoordinates = z.infer<
	typeof ApiEarthquakeCoordinatesSchema
>;
export type ApiEarthquakeItem = z.infer<typeof ApiEarthquakeItemSchema>;
export type ApiEarthquakesOk = z.infer<typeof ApiEarthquakesOkSchema>;
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ApiResponseBody = z.infer<typeof ApiResponseBodySchema>;
export type BackendQueryParams = z.infer<typeof BackendQueryParamsSchema>;
export type BackendEarthquakeEvent = z.infer<
	typeof BackendEarthquakeEventSchema
>;
export type BackendQueryResponse = z.infer<typeof BackendQueryResponseSchema>;
export type BackendErrorResponse = z.infer<typeof BackendErrorResponseSchema>;
export type PopularFilter = z.infer<typeof PopularFilterSchema>;
export type AnalyticsResponse = z.infer<typeof AnalyticsResponseSchema>;
